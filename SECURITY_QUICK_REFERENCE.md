# Security Setup Quick Reference

## 🚀 Quick Start

### 1. Check Current Security Status
```bash
npm run check-security
```

### 2. Set Up Security (Choose One Method)

#### Method A: Run SQL in Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `security_setup.sql`
3. Paste and run

#### Method B: Run via Node.js
```bash
npm run setup-security
```

### 3. Verify Security is Working
```bash
npm run check-security
```

## 📋 What Gets Secured

| Table | Current Status | After Setup |
|-------|---------------|-------------|
| `clients` | ❌ Unrestricted | ✅ RLS Enabled |
| `users` | ❌ Unrestricted | ✅ RLS Enabled |
| `profiles` | ❌ Unrestricted | ✅ RLS Enabled |
| `file_upload_audit` | ❌ Unrestricted | ✅ RLS Enabled |
| `upload_link_audit` | ❌ Unrestricted | ✅ RLS Enabled |
| `token_validation_log` | ❌ Unrestricted | ✅ RLS Enabled |
| `file_send_clients` | ✅ Already Secured | ✅ RLS Enabled |
| `activity_log` | ✅ Already Secured | ✅ RLS Enabled |

## 🔒 Security Policies Created

Each table gets these policies:
- **SELECT**: Users can only view their own data
- **INSERT**: Users can only insert data with their own user ID
- **UPDATE**: Users can only update their own data
- **DELETE**: Users can only delete their own data (where applicable)

## 🧪 Testing Security

### Test Data Isolation
1. Create two test user accounts
2. Add data as User A
3. Log in as User B
4. Verify User B cannot see User A's data

### Test in Supabase Dashboard
1. Go to Table Editor
2. Try to view/edit data
3. Should only see your own data

## 🚨 Troubleshooting

### Common Issues
- **"Policy already exists"** → Normal, script handles this
- **"Table doesn't exist"** → Some tables might not exist yet
- **Authentication errors** → Check Clerk configuration

### Verification Commands
```bash
# Check security status
npm run check-security

# Check specific table
SELECT * FROM pg_policies WHERE tablename = 'clients';
```

## 📞 Support

- Check `SECURITY_SETUP_GUIDE.md` for detailed instructions
- Review Supabase logs for error details
- Test with simple queries first

## 🔄 Maintenance

### Regular Checks
- Run `npm run check-security` monthly
- Monitor for new tables that need security
- Review access patterns in logs

### Adding New Tables
When adding new tables, remember to:
1. Enable RLS: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
2. Create policies for SELECT, INSERT, UPDATE, DELETE
3. Test with multiple user accounts
