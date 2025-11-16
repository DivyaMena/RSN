# Rising Stars Nation - Database Access Guide

## YOUR DATABASE QUESTION ANSWERED: YES!

### ✅ You CAN Access Your Database
### ✅ You CAN Shift to Your Own Database

---

## Current Database Location

**Type**: MongoDB  
**Location**: Running inside your Emergent container  
**Connection String**: `mongodb://localhost:27017`  
**Database Name**: `test_database`

---

## How to ACCESS Your Database

### Method 1: Command Line (mongosh)

```bash
# Connect to MongoDB
mongosh

# Switch to your database
use test_database

# View all collections
show collections

# View data
db.students.find().pretty()
db.batches.find().pretty()
db.users.find().pretty()
db.logboard_entries.find().pretty()

# Count records
db.students.countDocuments()
db.batches.countDocuments()

# Find specific data
db.students.find({class_level: 9})
db.batches.find({status: "active"})
```

### Method 2: MongoDB Compass (Desktop GUI - Recommended)

1. **Download**: https://www.mongodb.com/try/download/compass
2. **Install** on your computer
3. **Connect**: Use connection string `mongodb://localhost:27017`
4. **Browse** visually with GUI
5. **Export/Import** data easily
6. **Run queries** with UI

---

## How to SHIFT to Your OWN Database

### Option 1: MongoDB Atlas (FREE Tier - Recommended)

**Steps**:
1. Go to https://www.mongodb.com/cloud/atlas
2. Create **free account**
3. Create **free cluster** (512 MB storage free)
4. Get your **connection string**:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/
   ```
5. **Edit** `/app/backend/.env`:
   ```
   MONGO_URL="mongodb+srv://username:password@cluster.mongodb.net/"
   DB_NAME="rising_stars_db"
   ```
6. **Restart backend**:
   ```bash
   sudo supervisorctl restart backend
   ```

**Benefits**:
- ✅ Free 512 MB storage
- ✅ Cloud-hosted (accessible anywhere)
- ✅ Automatic backups
- ✅ No maintenance

### Option 2: Your Own MongoDB Server

**If you have your own MongoDB server**:

1. Get your connection string
2. Edit `/app/backend/.env`:
   ```
   MONGO_URL="mongodb://your-server-ip:27017/"
   DB_NAME="your_database_name"
   ```
3. Restart:
   ```bash
   sudo supervisorctl restart backend
   ```

### Option 3: Other Cloud Providers

**Azure Cosmos DB**:
- Compatible with MongoDB
- Get connection string from Azure portal
- Update `.env` file

**AWS DocumentDB**:
- MongoDB-compatible
- Get connection string from AWS console
- Update `.env` file

---

## Your Data Collections

Your database contains these collections:

| Collection | Description | Count (Test Data) |
|-----------|-------------|-------------------|
| `users` | All user accounts | 5 users |
| `user_sessions` | Login sessions | 5 sessions |
| `students` | Student profiles | 15 students |
| `tutors` | Tutor profiles | 2 tutors |
| `batches` | All batches | 4 batches |
| `batch_tutor_assignments` | Tutor-batch mappings | 3 assignments |
| `logboard_entries` | Class logs | 4 entries |
| `curriculum` | Pre-loaded curriculum | 36+ items |
| `attendance` | Attendance records | (ready) |
| `remedial_requests` | Student help requests | (ready) |

---

## Migrating Your Data

### Export Current Data

```bash
# Export all data
mongodump --db test_database --out /app/backup

# Export specific collection
mongodump --db test_database --collection students --out /app/backup
```

### Import to New Database

```bash
# To MongoDB Atlas
mongorestore --uri "mongodb+srv://username:password@cluster.mongodb.net/" /app/backup

# To another MongoDB
mongorestore --host your-server-ip --port 27017 --db your_db_name /app/backup/test_database
```

---

## Backup Your Data

### Regular Backups (Recommended)

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
mongodump --db test_database --out /app/backups/backup_$DATE

# Keep only last 7 days
find /app/backups -type d -mtime +7 -exec rm -rf {} \;
```

### Automated Backups

If using **MongoDB Atlas**:
- Automatic backups included in free tier
- Point-in-time recovery available
- No manual backup needed

---

## Security Considerations

### Current Setup (Development)
- No password required (localhost only)
- Accessible only from container

### Production Setup (Recommended)

1. **Use MongoDB Atlas** with authentication
2. **Enable SSL/TLS** for connections
3. **Set strong passwords**
4. **Whitelist IP addresses**
5. **Regular backups**

---

## Quick Reference

### View Your Data
```bash
mongosh
use test_database
db.students.find().pretty()
```

### Change Database
Edit `/app/backend/.env`:
```
MONGO_URL="your-connection-string"
DB_NAME="your_database_name"
```

Restart:
```bash
sudo supervisorctl restart backend
```

### Check Connection
```bash
mongosh $MONGO_URL
```

---

## Summary

✅ **YES** - You can access your database  
✅ **YES** - You can shift to your own database  
✅ **Easy** - Just update .env file and restart  
✅ **Portable** - Export/import anytime  
✅ **Free options** - MongoDB Atlas free tier available  

**Your data is fully under your control!**
