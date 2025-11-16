"""Subject configuration based on class levels"""

# Science is only for classes 6 & 7
# Classes 8, 9, 10 have separate Physics and Biology

SUBJECTS_BY_CLASS = {
    6: ["MAT", "SCI", "ENG"],  # Mathematics, Science, English
    7: ["MAT", "SCI", "ENG"],  # Mathematics, Science, English
    8: ["MAT", "PHY", "BIO", "ENG"],  # Mathematics, Physics, Biology, English
    9: ["MAT", "PHY", "BIO", "ENG"],  # Mathematics, Physics, Biology, English
    10: ["MAT", "PHY", "BIO", "ENG"]  # Mathematics, Physics, Biology, English
}

SUBJECT_NAMES = {
    "MAT": "Mathematics",
    "PHY": "Physics",
    "SCI": "Science",
    "BIO": "Biology",
    "ENG": "English"
}

def get_subjects_for_class(class_level: int) -> list:
    """Get available subjects for a class level"""
    return SUBJECTS_BY_CLASS.get(class_level, [])

def is_valid_subject_for_class(subject: str, class_level: int) -> bool:
    """Check if a subject is valid for a class level"""
    return subject in SUBJECTS_BY_CLASS.get(class_level, [])
