# Integration Script Notes

## ⚠️ Important: Source Backup

The `integrate-webflow.js` script previously used `source-backup/` directory as a reference. This has been removed to keep the repository clean.

## 🔄 How to Use Integration Script

### First Time / After Major Changes

If you need to re-integrate from scratch:

1. **Save current source as backup:**
   ```bash
   cp source/balls-source.html source-balls-backup.html
   ```

2. **Update the integration script to use the backup:**
   ```javascript
   const CLEAN_BACKUP = path.join(__dirname, 'source-balls-backup.html');
   ```

3. **Run integration:**
   ```bash
   npm run integrate
   ```

4. **Clean up:**
   ```bash
   rm source-balls-backup.html
   ```

### Alternative: Git-based Backup

Extract from git history when needed:
```bash
git show 3fdeb30:source/balls-source.html > /tmp/balls-source.html
```

Then update the script to use `/tmp/balls-source.html`.

## 📝 Line Numbers Reference

Current structure in `source/balls-source.html`:
- CSS: lines 6-128 (123 lines)
- Panel: lines 132-215 (84 lines)  
- Script: lines 216-1732 (1517 lines)

These line numbers are used by the integration script and are stable for the current implementation.

## 🎯 Normal Workflow

For normal Webflow updates, you typically:
1. Export new design from Webflow
2. Place in `webflow export/` directory
3. Manually integrate critical changes
4. Run `npm run build` to update production

The integration script is mainly for major restructuring, not routine updates.
