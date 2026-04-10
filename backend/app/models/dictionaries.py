from sqlalchemy import Column, String, UUID
from app.core.database import Base
import uuid

# Dictionary/reference tables for categories
# These are simple key-value tables used by CategoryFilters
DICTIONARY_TABLE_NAMES = [
    "yoga_practice_types", "cuisine_types", "music_genres", "seminar_topics",
    "picnic_types", "photography_themes", "quest_themes", "dance_styles",
    "volunteer_activity_types", "fitness_workout_types", "theater_genres",
    "craft_types", "sports_types", "eco_tour_types",
]


def create_dictionary_model(table_name):
    """Dynamically create a model class for a dictionary table."""
    class DictModel(Base):
        __tablename__ = table_name
        id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        name = Column(String(200), nullable=False)

        def to_dict(self):
            return {"id": str(self.id), "name": self.name}

    return DictModel


# Create all dictionary models
YogaPracticeType = create_dictionary_model("yoga_practice_types")
CuisineType = create_dictionary_model("cuisine_types")
MusicGenre = create_dictionary_model("music_genres")
SeminarTopic = create_dictionary_model("seminar_topics")
PicnicType = create_dictionary_model("picnic_types")
PhotographyTheme = create_dictionary_model("photography_themes")
QuestTheme = create_dictionary_model("quest_themes")
DanceStyle = create_dictionary_model("dance_styles")
VolunteerActivityType = create_dictionary_model("volunteer_activity_types")
FitnessWorkoutType = create_dictionary_model("fitness_workout_types")
TheaterGenre = create_dictionary_model("theater_genres")
CraftType = create_dictionary_model("craft_types")
SportsType = create_dictionary_model("sports_types")
EcoTourType = create_dictionary_model("eco_tour_types")

# Map table name -> model class
DICTIONARY_MODELS = {
    "yoga_practice_types": YogaPracticeType,
    "cuisine_types": CuisineType,
    "music_genres": MusicGenre,
    "seminar_topics": SeminarTopic,
    "picnic_types": PicnicType,
    "photography_themes": PhotographyTheme,
    "quest_themes": QuestTheme,
    "dance_styles": DanceStyle,
    "volunteer_activity_types": VolunteerActivityType,
    "fitness_workout_types": FitnessWorkoutType,
    "theater_genres": TheaterGenre,
    "craft_types": CraftType,
    "sports_types": SportsType,
    "eco_tour_types": EcoTourType,
}
