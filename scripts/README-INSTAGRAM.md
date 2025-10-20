# Instagram Feed Automation

## Setup (One-Time)

1. **Get Instagram Access Token** (see main README for detailed steps)
2. **Add GitHub Secrets**:
   - `IG_ACCESS_TOKEN`: Your initial long-lived token
   - `IG_USER_ID`: Your Instagram user ID

## How It Works (Fully Automated)

- **Feed Update**: Runs daily at 2:30 AM UTC
- **Token Refresh**: Runs monthly on the 1st
- **Zero manual intervention** - Token auto-refreshes and saves to `.instagram-token`

## Token Management

The system automatically:
1. Refreshes token every month (before 60-day expiry)
2. Saves new token to `.instagram-token` file in repo
3. Commits the file automatically
4. Uses the refreshed token for all future requests

**You only need to set the initial token once!**

## Files

- `.instagram-token` - Auto-generated, contains current token (committed to repo)
- `data/instagram.json` - Instagram feed data (auto-updated daily)

## Manual Operations (Optional)

### Refresh Token Manually
```bash
$env:IG_ACCESS_TOKEN="your_current_token"
pwsh scripts/refresh-instagram-token.ps1
```

### Fetch Feed Manually
```bash
$env:IG_ACCESS_TOKEN="your_token"
$env:IG_USER_ID="your_user_id"
pwsh scripts/fetch-instagram-media.ps1 -AccessToken $env:IG_ACCESS_TOKEN -UserId $env:IG_USER_ID
```

## Troubleshooting

**No posts showing?**
- Run "Update Instagram Media" workflow manually
- Check `data/instagram.json` has media
- Verify Instagram account is Business/Creator

**Token issues?**
- Check if `.instagram-token` file exists
- If missing, workflow will use `IG_ACCESS_TOKEN` secret
- Generate new token if both are expired

## Security Note

The token in `.instagram-token` is a **read-only** Instagram token. It can only:
- Read your public Instagram posts
- Cannot post, delete, or modify anything
- Safe to commit to public repos

## Cost

Instagram Graph API is free for basic usage.
