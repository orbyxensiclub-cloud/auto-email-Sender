#!/usr/bin/env python3
"""
check_campaign.py — Gmail Campaign Response & Bounce Classifier

Connects to Gmail via the Gmail API (OAuth 2.0, read-only scope) and classifies
every recipient of an email campaign into:
  - BOUNCED (PERMANENT or TEMPORARY, with status code and diagnostic text)
  - REPLIED (direct human reply, with date and subject)
  - REPLIED_OTHER_SENDER (reply from a colleague at the same corporate domain)
  - AUTO-REPLY (out-of-office, absence, automatic response)
  - NO RESPONSE (everyone left over)

Outputs:
  - results.csv (full classification report)
  - to_retry.csv (temporary bounces & no response)
  - to_clean.csv (permanent bounces to remove from CRM)
  - replied.csv (all positive and colleague responses)

Author: ORBYX ML Challenge Outreach Team
"""

import argparse
import base64
import csv
import datetime
import email
from email import policy
import logging
import os
import re
import sys
import time
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

# Google API Client imports (checked in main)
HAS_GOOGLE_LIBS = False
try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import Resource, build
    from googleapiclient.errors import HttpError
    HAS_GOOGLE_LIBS = True
except ImportError:
    HAS_GOOGLE_LIBS = False

# Only read-only permission requested
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

# Generic / Public Webmail domains that should NOT match other senders as colleagues
GENERIC_DOMAINS: Set[str] = {
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "yahoo.fr",
    "outlook.com",
    "outlook.fr",
    "hotmail.com",
    "hotmail.fr",
    "live.com",
    "icloud.com",
    "aol.com",
    "protonmail.com",
    "proton.me",
    "mail.com",
    "zoho.com",
    "orange.fr",
    "wanadoo.fr",
    "free.fr",
    "sfr.fr",
}

# Regex patterns for French and English auto-reply subjects
AUTO_REPLY_SUBJECT_REGEX = re.compile(
    r"(?:automatic\s*reply|out\s*of\s*office|auto[- ]?reply|réponse\s*automatique|absent\s*du\s*bureau|absence\s*du\s*bureau|congés|vacances|en\s*déplacement)",
    re.IGNORECASE,
)

# Regex patterns for delivery status failure codes and reasons
STATUS_CODE_REGEX = re.compile(r"\b([45]\.\d{1,3}\.\d{1,3})\b")
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")

logger = logging.getLogger("check_campaign")


def setup_logging(verbose: bool = False) -> None:
    """Configure terminal logging format."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )


def execute_with_backoff(request_func, max_retries: int = 5):
    """Execute a Google API request with exponential backoff on rate limits."""
    for attempt in range(max_retries):
        try:
            return request_func.execute()
        except HttpError as error:
            status_code = error.resp.status if error.resp else 500
            if status_code in (429, 500, 503) and attempt < max_retries - 1:
                sleep_time = (2 ** attempt) + (0.1 * (attempt + 1))
                logger.warning(
                    f"Rate limit / HTTP {status_code}. Retrying in {sleep_time:.1f}s (attempt {attempt + 1}/{max_retries})..."
                )
                time.sleep(sleep_time)
            else:
                raise
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise


def get_gmail_service(credentials_path: str, token_path: str) -> Resource:
    """
    Authenticate via OAuth 2.0 Desktop app client and return the Gmail API service.
    Tokens are stored and refreshed automatically in token.json.
    """
    creds: Optional[Credentials] = None

    if os.path.exists(token_path):
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
            logger.debug(f"Loaded existing token from {token_path}")
        except Exception as e:
            logger.warning(f"Could not load token file: {e}. Re-authenticating...")

    # Refresh expired credentials or create new OAuth consent flow
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            logger.info("Access token expired. Refreshing token automatically...")
            try:
                creds.refresh(Request())
            except Exception as refresh_err:
                logger.warning(f"Token refresh failed: {refresh_err}. Launching new login flow...")
                creds = None

        if not creds or not creds.valid:
            if not os.path.exists(credentials_path):
                raise FileNotFoundError(
                    f"OAuth credentials file not found at '{credentials_path}'.\n"
                    "Please download your credentials.json (Desktop Client) from Google Cloud Console "
                    "and place it in this folder."
                )

            logger.info("Opening browser for Google OAuth 2.0 authorization (read-only)...")
            flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
            creds = flow.run_local_server(port=0)

        # Save credentials for next run
        with open(token_path, "w", encoding="utf-8") as token_file:
            token_file.write(creds.to_json())
            logger.info(f"Saved refreshed OAuth token to {token_path}")

    return build("gmail", "v1", credentials=creds)


def load_recipients(csv_path: str) -> List[Dict[str, str]]:
    """
    Load recipient list from recipients.csv with columns: email, name, company.
    Normalizes whitespace and lowercases email addresses.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Recipients file not found at '{csv_path}'")

    recipients: List[Dict[str, str]] = []
    encodings = ["utf-8-sig", "utf-8", "latin-1"]

    for enc in encodings:
        try:
            with open(csv_path, mode="r", encoding=enc) as f:
                reader = csv.DictReader(f)
                headers = [h.strip().lower() for h in (reader.fieldnames or [])]

                email_col = next((h for h in reader.fieldnames or [] if h.strip().lower() in ("email", "e-mail", "mail")), None)
                name_col = next((h for h in reader.fieldnames or [] if h.strip().lower() in ("name", "nom", "contact")), None)
                company_col = next((h for h in reader.fieldnames or [] if h.strip().lower() in ("company", "entreprise", "société", "societe")), None)

                if not email_col:
                    raise ValueError(f"CSV file must contain an 'email' column. Found columns: {reader.fieldnames}")

                f.seek(0)
                reader = csv.DictReader(f)
                for row in reader:
                    raw_email = (row.get(email_col) or "").strip().lower()
                    if not raw_email or "@" not in raw_email:
                        continue
                    recipients.append({
                        "email": raw_email,
                        "name": (row.get(name_col) or "").strip() if name_col else "",
                        "company": (row.get(company_col) or "").strip() if company_col else "",
                    })
            logger.info(f"Loaded {len(recipients)} recipients from {csv_path} (encoding: {enc})")
            return recipients
        except UnicodeDecodeError:
            continue

    raise ValueError(f"Unable to decode {csv_path} with supported encodings.")


class BounceInfo:
    """Holds parsed bounce diagnostic information."""

    def __init__(
        self,
        failed_email: str,
        bounce_type: str,  # PERMANENT or TEMPORARY
        status_code: str,
        diagnostic_text: str,
        rule_used: str,
        message_date: str = "",
    ):
        self.failed_email = failed_email.strip().lower()
        self.bounce_type = bounce_type
        self.status_code = status_code
        self.diagnostic_text = diagnostic_text
        self.rule_used = rule_used
        self.message_date = message_date

    @property
    def full_reason(self) -> str:
        parts = []
        if self.status_code:
            parts.append(f"[{self.status_code}]")
        if self.diagnostic_text:
            parts.append(self.diagnostic_text)
        if self.rule_used:
            parts.append(f"(Rule: {self.rule_used})")
        return " ".join(parts) if parts else "Delivery failed without diagnostic details"


def extract_header(headers: List[Dict[str, str]], name: str) -> str:
    """Retrieve header value case-insensitively."""
    name_lower = name.lower()
    for h in headers:
        if h.get("name", "").lower() == name_lower:
            return h.get("value", "")
    return ""


def get_body_text_recursive(payload: Dict[str, Any]) -> str:
    """Recursively extract plain text or decoded message parts from payload."""
    body_text = ""
    mime_type = payload.get("mimeType", "")

    # Direct body data
    data = payload.get("body", {}).get("data")
    if data:
        try:
            decoded = base64.urlsafe_b64decode(data.encode("ASCII")).decode("utf-8", errors="replace")
            body_text += " " + decoded
        except Exception:
            pass

    # Parts
    for part in payload.get("parts", []):
        body_text += " " + get_body_text_recursive(part)

    return body_text


def parse_delivery_status_part(part: Dict[str, Any]) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Parse a message/delivery-status part for:
      - Final-Recipient
      - Action (failed, delayed, etc.)
      - Status code (e.g. 5.1.1, 4.4.7)
    """
    final_recipient = None
    status_code = None
    diag_code = None

    data = part.get("body", {}).get("data")
    if not data:
        return None, None, None

    try:
        decoded_bytes = base64.urlsafe_b64decode(data.encode("ASCII"))
        msg = email.message_from_bytes(decoded_bytes, policy=policy.default)
        for subpart in msg.walk():
            # Check Final-Recipient header
            rcpt = subpart.get("Final-Recipient")
            if rcpt and not final_recipient:
                # e.g., "rfc822; user@example.com"
                match = EMAIL_REGEX.search(rcpt)
                if match:
                    final_recipient = match.group(0).lower()

            # Status code
            stat = subpart.get("Status")
            if stat and not status_code:
                status_code = stat.strip()

            # Diagnostic code
            diag = subpart.get("Diagnostic-Code")
            if diag and not diag_code:
                diag_code = diag.strip()
    except Exception as e:
        logger.debug(f"Error parsing delivery status part: {e}")

    return final_recipient, status_code, diag_code


def find_bounces(
    service: Resource,
    cutoff_date: str,
    known_recipients: Set[str],
) -> Dict[str, BounceInfo]:
    """
    Search for all bounce notifications from mailer-daemon / postmaster.
    Extracts failed recipient, status code (5.x.x vs 4.x.x), and failure reason.
    """
    logger.info(f"Searching Gmail for bounce notifications since {cutoff_date}...")
    query = f"from:(mailer-daemon OR postmaster) after:{cutoff_date}"

    bounce_map: Dict[str, BounceInfo] = {}
    page_token = None
    total_found = 0

    while True:
        req = service.users().messages().list(
            userId="me",
            q=query,
            pageToken=page_token,
            maxResults=100,
        )
        resp = execute_with_backoff(req)
        messages = resp.get("messages", [])

        if not messages:
            break

        total_found += len(messages)
        logger.info(f"Retrieved batch of {len(messages)} bounce notifications (total inspected: {total_found})...")

        for msg_summary in messages:
            msg_id = msg_summary["id"]
            try:
                msg_req = service.users().messages().get(
                    userId="me",
                    id=msg_id,
                    format="full",
                )
                msg_data = execute_with_backoff(msg_req)
            except Exception as e:
                logger.warning(f"Could not fetch bounce message {msg_id}: {e}")
                continue

            payload = msg_data.get("payload", {})
            headers = payload.get("headers", [])

            subject = extract_header(headers, "Subject")
            msg_date = extract_header(headers, "Date")

            failed_email: Optional[str] = None
            status_code: Optional[str] = None
            diagnostic_text: Optional[str] = None
            rule_used: str = ""

            # 1. Primary rule: X-Failed-Recipients header
            x_failed = extract_header(headers, "X-Failed-Recipients")
            if x_failed:
                match = EMAIL_REGEX.search(x_failed)
                if match:
                    failed_email = match.group(0).lower()
                    rule_used = "X-Failed-Recipients header"

            # 2. Secondary rule: Inspect delivery-status parts
            if not failed_email:
                def walk_parts(p: Dict[str, Any]):
                    nonlocal failed_email, status_code, diagnostic_text, rule_used
                    if p.get("mimeType") == "message/delivery-status":
                        rcpt, stat, diag = parse_delivery_status_part(p)
                        if rcpt:
                            failed_email = rcpt
                            status_code = stat
                            diagnostic_text = diag
                            rule_used = "message/delivery-status part"
                    for sub in p.get("parts", []):
                        walk_parts(sub)

                walk_parts(payload)

            # 3. Fallback rule: Regex search in body text
            body_text = get_body_text_recursive(payload)
            if not failed_email:
                # Look for lines mentioning recipient failure
                candidate_emails = EMAIL_REGEX.findall(body_text)
                for cand in candidate_emails:
                    cand_lower = cand.lower()
                    if cand_lower in known_recipients:
                        failed_email = cand_lower
                        rule_used = "Body regex match on recipient pool"
                        break

            # If still not matching known list, take the first valid non-mailer address
            if not failed_email:
                all_cands = EMAIL_REGEX.findall(body_text)
                for c in all_cands:
                    c_lower = c.lower()
                    if "google" not in c_lower and "daemon" not in c_lower and "postmaster" not in c_lower:
                        failed_email = c_lower
                        rule_used = "Body regex fallback"
                        break

            if not failed_email:
                continue

            # Extract status code if not yet found
            if not status_code:
                code_match = STATUS_CODE_REGEX.search(body_text)
                if code_match:
                    status_code = code_match.group(1)

            # Extract diagnostic text excerpt
            if not diagnostic_text:
                for line in body_text.splitlines():
                    line_clean = line.strip()
                    if any(
                        kw in line_clean.lower()
                        for kw in ["550", "554", "5.1.1", "nxdomain", "user unknown", "no such", "not found", "dns", "rejected"]
                    ):
                        diagnostic_text = line_clean[:120]
                        break

            # Classify bounce type (PERMANENT vs TEMPORARY)
            bounce_type = "PERMANENT"
            if status_code and status_code.startswith("4."):
                bounce_type = "TEMPORARY"
                rule_used += " | 4.x.x status code"
            elif status_code and status_code.startswith("5."):
                bounce_type = "PERMANENT"
                rule_used += " | 5.x.x status code"
            else:
                # Heuristic keyword check
                temp_keywords = ["mailbox full", "quota exceeded", "temporary failure", "try again", "450", "451", "452", "timed out"]
                if any(kw in (body_text or "").lower() for kw in temp_keywords):
                    bounce_type = "TEMPORARY"
                    rule_used += " | temporary error keyword"
                else:
                    bounce_type = "PERMANENT"
                    rule_used += " | permanent error default/keyword"

            bounce_info = BounceInfo(
                failed_email=failed_email,
                bounce_type=bounce_type,
                status_code=status_code or "",
                diagnostic_text=diagnostic_text or subject or "Undelivered",
                rule_used=rule_used,
                message_date=msg_date,
            )

            # Save the latest or more specific bounce
            bounce_map[failed_email] = bounce_info

        page_token = resp.get("nextPageToken")
        if not page_token:
            break

    logger.info(f"Identified {len(bounce_map)} unique bounced email addresses.")
    return bounce_map


class ReplyInfo:
    """Holds reply information."""

    def __init__(
        self,
        sender_email: str,
        is_auto_reply: bool,
        reply_date: str,
        reply_subject: str,
        is_colleague: bool = False,
    ):
        self.sender_email = sender_email
        self.is_auto_reply = is_auto_reply
        self.reply_date = reply_date
        self.reply_subject = reply_subject
        self.is_colleague = is_colleague


def check_is_auto_reply(headers: List[Dict[str, str]], subject: str) -> bool:
    """Check if message is an automated out-of-office / bounce notice."""
    auto_sub = extract_header(headers, "Auto-Submitted").lower()
    if auto_sub and auto_sub != "no":
        return True

    x_auto = extract_header(headers, "X-Autoreply").lower()
    if x_auto and x_auto in ("yes", "true", "1"):
        return True

    precedence = extract_header(headers, "Precedence").lower()
    if precedence in ("auto_reply", "bulk", "junk"):
        return True

    if AUTO_REPLY_SUBJECT_REGEX.search(subject):
        return True

    return False


def find_replies_for_recipients(
    service: Resource,
    recipients: List[Dict[str, str]],
    cutoff_date: str,
) -> Tuple[Dict[str, ReplyInfo], Dict[str, ReplyInfo]]:
    """
    Search for incoming messages from each recipient (or colleagues at the same domain).
    Returns:
      (direct_replies_map, domain_colleague_replies_map)
    """
    logger.info(f"Checking incoming replies for {len(recipients)} recipients since {cutoff_date}...")

    direct_replies: Dict[str, ReplyInfo] = {}
    colleague_replies: Dict[str, ReplyInfo] = {}

    # Group recipients by domain for colleague reply matching
    domain_to_recipients: Dict[str, List[str]] = defaultdict(list)
    for r in recipients:
        em = r["email"]
        domain = em.split("@")[-1]
        domain_to_recipients[domain].append(em)

    # Process in batches of 15 emails per search query to minimize API calls
    chunk_size = 15
    for i in range(0, len(recipients), chunk_size):
        chunk = recipients[i : i + chunk_size]
        query_emails = " OR ".join([f"from:{r['email']}" for r in chunk])
        query = f"({query_emails}) after:{cutoff_date} -from:mailer-daemon -from:postmaster"

        page_token = None
        while True:
            req = service.users().messages().list(
                userId="me",
                q=query,
                pageToken=page_token,
                maxResults=100,
            )
            resp = execute_with_backoff(req)
            messages = resp.get("messages", [])

            if not messages:
                break

            for msg_summary in messages:
                msg_id = msg_summary["id"]
                try:
                    # Fetch only metadata headers to keep response payload minimal and fast
                    msg_req = service.users().messages().get(
                        userId="me",
                        id=msg_id,
                        format="metadata",
                        metadataHeaders=["From", "Subject", "Date", "Auto-Submitted", "X-Autoreply", "Precedence"],
                    )
                    msg_data = execute_with_backoff(msg_req)
                except Exception as e:
                    logger.debug(f"Could not fetch reply message {msg_id}: {e}")
                    continue

                headers = msg_data.get("payload", {}).get("headers", [])
                from_hdr = extract_header(headers, "From")
                subject = extract_header(headers, "Subject")
                date_str = extract_header(headers, "Date")

                from_match = EMAIL_REGEX.search(from_hdr)
                if not from_match:
                    continue

                sender_email = from_match.group(0).lower()
                is_auto = check_is_auto_reply(headers, subject)

                reply_obj = ReplyInfo(
                    sender_email=sender_email,
                    is_auto_reply=is_auto,
                    reply_date=date_str,
                    reply_subject=subject,
                    is_colleague=False,
                )

                # Prioritize real human reply over auto-reply if multiple exist
                if sender_email not in direct_replies or (direct_replies[sender_email].is_auto_reply and not is_auto):
                    direct_replies[sender_email] = reply_obj

            page_token = resp.get("nextPageToken")
            if not page_token:
                break

    # Secondary check: Colleague replies from the same corporate domain
    corporate_domains = [d for d in domain_to_recipients.keys() if d not in GENERIC_DOMAINS and "." in d]
    logger.info(f"Scanning corporate domains ({len(corporate_domains)}) for colleague replies...")

    for domain in corporate_domains:
        target_recipients = domain_to_recipients[domain]
        # Skip if all recipients in this domain already have a direct reply
        if all(r in direct_replies for r in target_recipients):
            continue

        domain_query = f"from:@{domain} after:{cutoff_date} -from:mailer-daemon -from:postmaster"
        try:
            req = service.users().messages().list(userId="me", q=domain_query, maxResults=30)
            resp = execute_with_backoff(req)
            msgs = resp.get("messages", [])

            for m in msgs:
                msg_req = service.users().messages().get(
                    userId="me",
                    id=m["id"],
                    format="metadata",
                    metadataHeaders=["From", "Subject", "Date", "Auto-Submitted", "X-Autoreply", "Precedence"],
                )
                m_data = execute_with_backoff(msg_req)
                headers = m_data.get("payload", {}).get("headers", [])
                from_hdr = extract_header(headers, "From")
                subject = extract_header(headers, "Subject")
                date_str = extract_header(headers, "Date")

                from_match = EMAIL_REGEX.search(from_hdr)
                if not from_match:
                    continue

                sender = from_match.group(0).lower()
                is_auto = check_is_auto_reply(headers, subject)

                # Check if sender is a different address at the same domain
                for target_recip in target_recipients:
                    if target_recip != sender and target_recip not in direct_replies:
                        if target_recip not in colleague_replies or (colleague_replies[target_recip].is_auto_reply and not is_auto):
                            colleague_replies[target_recip] = ReplyInfo(
                                sender_email=sender,
                                is_auto_reply=is_auto,
                                reply_date=date_str,
                                reply_subject=subject,
                                is_colleague=True,
                            )
        except Exception as e:
            logger.debug(f"Domain search error for {domain}: {e}")

    logger.info(
        f"Found {len(direct_replies)} direct replies and {len(colleague_replies)} colleague replies from same domain."
    )
    return direct_replies, colleague_replies


def main():
    parser = argparse.ArgumentParser(
        description="Classify Gmail campaign recipients into BOUNCED, REPLIED, AUTO-REPLY, or NO RESPONSE."
    )
    parser.add_argument(
        "--recipients",
        "-r",
        default="recipients.csv",
        help="Path to recipients CSV file (default: recipients.csv)",
    )
    parser.add_argument(
        "--days",
        "-d",
        type=int,
        default=14,
        help="Number of past days to check for bounces and replies (default: 14)",
    )
    parser.add_argument(
        "--credentials",
        "-c",
        default="credentials.json",
        help="Path to Google OAuth 2.0 credentials.json (default: credentials.json)",
    )
    parser.add_argument(
        "--token",
        "-t",
        default="token.json",
        help="Path to cache authenticated OAuth token.json (default: token.json)",
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        default=".",
        help="Directory to save results CSV files (default: current directory)",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable detailed debug logs",
    )

    args = parser.parse_args()
    setup_logging(args.verbose)

    # Calculate cutoff date in YYYY/MM/DD for Gmail queries
    cutoff_dt = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=args.days)
    cutoff_str = cutoff_dt.strftime("%Y/%m/%d")

    print("\n" + "=" * 65)
    print("  GMAIL CAMPAIGN CLASSIFIER & BOUNCE AUDITOR")
    print(f"  Period: Last {args.days} days (since {cutoff_str})")
    print(f"  Recipients File: {args.recipients}")
    print("=" * 65 + "\n")

    # 1. Load recipients
    try:
        recipients = load_recipients(args.recipients)
    except Exception as e:
        logger.error(f"Failed to load recipients: {e}")
        sys.exit(1)

    known_emails = {r["email"] for r in recipients}

    # 2. Authenticate Gmail API
    if not HAS_GOOGLE_LIBS:
        print(
            "\nERROR: Missing Google API dependencies. Please install them using:\n"
            "  pip install -r requirements.txt\n"
            "or: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib\n"
        )
        sys.exit(1)

    try:
        service = get_gmail_service(args.credentials, args.token)
    except Exception as e:
        logger.error(f"Gmail authentication failed: {e}")
        sys.exit(1)

    # 3. Retrieve bounces
    try:
        bounces_map = find_bounces(service, cutoff_str, known_emails)
    except Exception as e:
        logger.error(f"Error fetching bounces: {e}")
        bounces_map = {}

    # 4. Retrieve replies
    try:
        direct_replies, colleague_replies = find_replies_for_recipients(service, recipients, cutoff_str)
    except Exception as e:
        logger.error(f"Error fetching replies: {e}")
        direct_replies, colleague_replies = {}, {}

    # 5. Classify every recipient
    results: List[Dict[str, str]] = []
    status_counts: Counter = Counter()
    bounce_reasons_by_domain: Dict[str, Counter] = defaultdict(Counter)

    for item in recipients:
        email_addr = item["email"]
        domain = email_addr.split("@")[-1]
        name = item.get("name", "")
        company = item.get("company", "")

        status = "NO RESPONSE"
        bounce_type = ""
        bounce_reason = ""
        reply_date = ""
        reply_subject = ""
        reply_from = ""

        # Priority 1: BOUNCE
        if email_addr in bounces_map:
            b_info = bounces_map[email_addr]
            status = "BOUNCED"
            bounce_type = b_info.bounce_type
            bounce_reason = b_info.full_reason
            bounce_reasons_by_domain[domain][f"[{b_info.status_code or 'N/A'}] {b_info.diagnostic_text}"] += 1

        # Priority 2: DIRECT REPLY
        elif email_addr in direct_replies:
            r_info = direct_replies[email_addr]
            if r_info.is_auto_reply:
                status = "AUTO-REPLY"
            else:
                status = "REPLIED"
            reply_date = r_info.reply_date
            reply_subject = r_info.reply_subject
            reply_from = r_info.sender_email

        # Priority 3: COLLEAGUE REPLY FROM SAME DOMAIN
        elif email_addr in colleague_replies:
            c_info = colleague_replies[email_addr]
            if c_info.is_auto_reply:
                status = "AUTO-REPLY"
            else:
                status = "REPLIED_OTHER_SENDER"
            reply_date = c_info.reply_date
            reply_subject = c_info.reply_subject
            reply_from = c_info.sender_email

        # Priority 4: NO RESPONSE
        else:
            status = "NO RESPONSE"

        status_counts[status] += 1

        results.append({
            "email": email_addr,
            "name": name,
            "company": company,
            "status": status,
            "bounce_type": bounce_type,
            "bounce_reason": bounce_reason,
            "reply_date": reply_date,
            "reply_subject": reply_subject,
            "reply_from": reply_from,
        })

    # 6. Write CSV Reports
    os.makedirs(args.output_dir, exist_ok=True)
    results_path = os.path.join(args.output_dir, "results.csv")
    retry_path = os.path.join(args.output_dir, "to_retry.csv")
    clean_path = os.path.join(args.output_dir, "to_clean.csv")
    replied_path = os.path.join(args.output_dir, "replied.csv")

    fieldnames = [
        "email",
        "name",
        "company",
        "status",
        "bounce_type",
        "bounce_reason",
        "reply_date",
        "reply_subject",
        "reply_from",
    ]

    # Write main results.csv
    with open(results_path, mode="w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    # Write to_retry.csv (Temporary bounces & No response)
    to_retry = [r for r in results if r["status"] == "NO RESPONSE" or r["bounce_type"] == "TEMPORARY"]
    with open(retry_path, mode="w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(to_retry)

    # Write to_clean.csv (Permanent bounces to purge from database)
    to_clean = [r for r in results if r["bounce_type"] == "PERMANENT"]
    with open(clean_path, mode="w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(to_clean)

    # Write replied.csv (Real replies and colleague responses)
    replied = [r for r in results if r["status"] in ("REPLIED", "REPLIED_OTHER_SENDER")]
    with open(replied_path, mode="w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(replied)

    # 7. Print Terminal Summary
    total_recipients = len(recipients)
    print("\n" + "=" * 65)
    print("  EXECUTIVE SUMMARY — CAMPAIGN ENGAGEMENT & DELIVERABILITY")
    print("=" * 65)
    print(f"Total Recipients Checked : {total_recipients}\n")
    print(f"  🟢 REPLIED (Direct)       : {status_counts['REPLIED']:>4} ({status_counts['REPLIED']/max(total_recipients,1)*100:5.1f}%)")
    print(f"  👥 REPLIED (Other Colleague): {status_counts['REPLIED_OTHER_SENDER']:>4} ({status_counts['REPLIED_OTHER_SENDER']/max(total_recipients,1)*100:5.1f}%)")
    print(f"  🟡 AUTO-REPLY (Out of Office): {status_counts['AUTO-REPLY']:>4} ({status_counts['AUTO-REPLY']/max(total_recipients,1)*100:5.1f}%)")
    print(f"  🔴 BOUNCED (Total)        : {status_counts['BOUNCED']:>4} ({status_counts['BOUNCED']/max(total_recipients,1)*100:5.1f}%)")
    print(f"      - Permanent (5.x.x)   : {len(to_clean):>4}")
    print(f"      - Temporary (4.x.x)   : {len([r for r in results if r['bounce_type'] == 'TEMPORARY']):>4}")
    print(f"  ⚪ NO RESPONSE            : {status_counts['NO RESPONSE']:>4} ({status_counts['NO RESPONSE']/max(total_recipients,1)*100:5.1f}%)")
    print("-" * 65)

    # Top 5 bounce reasons grouped by domain
    all_domain_bounces: List[Tuple[str, str, int]] = []
    for dom, reason_counter in bounce_reasons_by_domain.items():
        for reason, cnt in reason_counter.items():
            all_domain_bounces.append((dom, reason, cnt))

    all_domain_bounces.sort(key=lambda x: x[2], reverse=True)

    print("\nTOP 5 BOUNCE REASONS (GROUPED BY DOMAIN):")
    if not all_domain_bounces:
        print("  ✓ Aucun rebond détecté sur la période.")
    else:
        for idx, (dom, reason, cnt) in enumerate(all_domain_bounces[:5], start=1):
            print(f"  {idx}. [{cnt}x] @{dom} -> {reason}")

    print("\nOUTPUT FILES GENERATED:")
    print(f"  📁 Full results:      {results_path}")
    print(f"  📁 To retry (no resp/temp): {retry_path} ({len(to_retry)} contacts)")
    print(f"  📁 To clean (perm bounce):  {clean_path} ({len(to_clean)} contacts)")
    print(f"  📁 Replies (positive leads):{replied_path} ({len(replied)} contacts)")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()
