"""Seed curriculum data for TS and AP boards"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Sample curriculum data
CURRICULUM_DATA = {
    "TS": {
        6: {
            "MAT": [
                {"topic_number": 1, "topic_name": "Knowing Our Numbers", "description": "Large numbers, place value, comparisons"},
                {"topic_number": 2, "topic_name": "Whole Numbers", "description": "Properties of whole numbers, number line"},
                {"topic_number": 3, "topic_name": "Playing with Numbers", "description": "Factors, multiples, prime numbers"},
                {"topic_number": 4, "topic_name": "Basic Geometrical Ideas", "description": "Points, lines, angles, shapes"},
                {"topic_number": 5, "topic_name": "Integers", "description": "Understanding integers, operations"},
            ],
            "SCI": [
                {"topic_number": 1, "topic_name": "Food and Its Components", "description": "Nutrients, balanced diet"},
                {"topic_number": 2, "topic_name": "Sorting Materials", "description": "Properties of materials"},
                {"topic_number": 3, "topic_name": "Changes Around Us", "description": "Physical and chemical changes"},
                {"topic_number": 4, "topic_name": "Living Organisms", "description": "Characteristics of living things"},
            ],
            "ENG": [
                {"topic_number": 1, "topic_name": "Reading Comprehension", "description": "Understanding passages"},
                {"topic_number": 2, "topic_name": "Grammar Basics", "description": "Parts of speech, tenses"},
                {"topic_number": 3, "topic_name": "Writing Skills", "description": "Paragraph writing, letters"},
            ]
        },
        9: {
            "MAT": [
                {"topic_number": 1, "topic_name": "Number Systems", "description": "Real numbers, rational and irrational"},
                {"topic_number": 2, "topic_name": "Polynomials", "description": "Factorization, algebraic identities"},
                {"topic_number": 3, "topic_name": "Linear Equations in Two Variables", "description": "Graphical solutions"},
                {"topic_number": 4, "topic_name": "Quadrilaterals", "description": "Properties of parallelograms"},
            ],
            "PHY": [
                {"topic_number": 1, "topic_name": "Motion", "description": "Types of motion, speed, velocity"},
                {"topic_number": 2, "topic_name": "Force and Laws of Motion", "description": "Newton's laws"},
                {"topic_number": 3, "topic_name": "Gravitation", "description": "Universal law of gravitation"},
            ],
            "BIO": [
                {"topic_number": 1, "topic_name": "Cell - Basic Unit of Life", "description": "Cell structure and functions"},
                {"topic_number": 2, "topic_name": "Tissues", "description": "Plant and animal tissues"},
                {"topic_number": 3, "topic_name": "Diversity in Living Organisms", "description": "Classification"},
            ]
        },
        10: {
            "MAT": [
                {"topic_number": 1, "topic_name": "Real Numbers", "description": "Euclid's division algorithm, HCF, LCM"},
                {"topic_number": 2, "topic_name": "Polynomials", "description": "Quadratic polynomials, relationship between zeros and coefficients"},
                {"topic_number": 3, "topic_name": "Pair of Linear Equations", "description": "Algebraic and graphical methods"},
                {"topic_number": 4, "topic_name": "Quadratic Equations", "description": "Solutions by factorization and formula"},
                {"topic_number": 5, "topic_name": "Arithmetic Progressions", "description": "nth term, sum of terms"},
            ],
            "PHY": [
                {"topic_number": 1, "topic_name": "Light - Reflection and Refraction", "description": "Laws, mirrors, lenses"},
                {"topic_number": 2, "topic_name": "Electricity", "description": "Electric current, Ohm's law, power"},
                {"topic_number": 3, "topic_name": "Magnetic Effects of Current", "description": "Electromagnetic induction"},
            ],
            "BIO": [
                {"topic_number": 1, "topic_name": "Life Processes", "description": "Nutrition, respiration, transport"},
                {"topic_number": 2, "topic_name": "Control and Coordination", "description": "Nervous system, hormones"},
                {"topic_number": 3, "topic_name": "Heredity and Evolution", "description": "Genetics, Darwin's theory"},
            ]
        }
    },
    "AP": {
        # Similar structure for AP board (abbreviated for brevity)
        9: {
            "MAT": [
                {"topic_number": 1, "topic_name": "Number Systems", "description": "Real numbers representation"},
                {"topic_number": 2, "topic_name": "Polynomials", "description": "Operations and factorization"},
            ],
            "PHY": [
                {"topic_number": 1, "topic_name": "Motion", "description": "Uniform and non-uniform motion"},
            ]
        }
    }
}

async def seed_curriculum():
    """Seed curriculum data into MongoDB"""
    print("Seeding curriculum data...")
    
    # Clear existing curriculum
    await db.curriculum.delete_many({})
    
    count = 0
    for board, classes in CURRICULUM_DATA.items():
        for class_level, subjects in classes.items():
            for subject, topics in subjects.items():
                for topic in topics:
                    doc = {
                        "id": f"{board}-C{class_level}-{subject}-{topic['topic_number']}",
                        "board": board,
                        "class_level": class_level,
                        "subject": subject,
                        "topic_number": topic["topic_number"],
                        "topic_name": topic["topic_name"],
                        "description": topic.get("description", "")
                    }
                    await db.curriculum.insert_one(doc)
                    count += 1
    
    print(f"✅ Seeded {count} curriculum items")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_curriculum())
