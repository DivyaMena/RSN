"""
Regenerate schedule slots for all batches with fresh random assignments
"""
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
import random
from dotenv import load_dotenv

load_dotenv()

# Class rules
CLASS_DAYS = {
    6: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    7: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    8: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    9: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    10: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
}

SLOT_VALUES = ["17:00-18:00", "18:00-19:00"]

def generate_fresh_schedule(class_level: int, subject: str):
    """Generate fresh random schedule for a batch"""
    allowed_days = CLASS_DAYS.get(class_level, CLASS_DAYS[6])
    
    # Determine slots per week
    if class_level in [6, 7]:
        slots_per_week = 4
    elif class_level in [8, 9]:
        slots_per_week = 3
    elif class_level == 10:
        if subject in ["MAT", "PHY"]:
            slots_per_week = 4
        else:
            slots_per_week = 3
    else:
        slots_per_week = 3
    
    # Generate random schedule (no seed - truly random)
    assigned = []
    used_days = set()
    
    attempts = 0
    while len(assigned) < slots_per_week and attempts < 100:
        day = random.choice(allowed_days)
        
        # One slot per day for this batch
        if day in used_days:
            attempts += 1
            continue
        
        slot = random.choice(SLOT_VALUES)
        used_days.add(day)
        assigned.append({"day": day, "slot": slot})
    
    return assigned

async def regenerate_all_schedules():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Get all batches
    batches = await db.batches.find({}, {'_id': 0}).to_list(None)
    
    print(f'Found {len(batches)} batches to regenerate schedules for...\n')
    
    for batch in batches:
        # Generate fresh schedule
        new_schedule = generate_fresh_schedule(batch['class_level'], batch['subject'])
        
        # Update batch
        await db.batches.update_one(
            {'id': batch['id']},
            {'$set': {'schedule_slots': new_schedule}}
        )
        
        days = [slot['day'] for slot in new_schedule]
        print(f'✓ {batch["batch_code"]}: {", ".join(days)}')
    
    print(f'\n✅ Regenerated schedules for {len(batches)} batches!')
    client.close()

if __name__ == "__main__":
    asyncio.run(regenerate_all_schedules())
