from typing import Optional
from pydantic import BaseModel, Field


class AbilityScores(BaseModel):
    str_score: int = Field(alias="str")
    dex: int
    con: int
    int_score: int = Field(alias="int")
    wis: int
    cha: int

    model_config = {"populate_by_name": True}


class StatBlock(BaseModel):
    name: str
    size: str
    creature_type: str
    subtypes: list[str] = []
    hit_dice: str
    hit_points: int
    initiative: str
    speed: str
    armor_class: int
    ac_components: str
    base_attack: str
    grapple: str
    attacks: list[str] = []
    full_attack: list[str] = []
    space: str = "5 ft."
    reach: str = "5 ft."
    special_attacks: list[str] = []
    special_qualities: list[str] = []
    saves: dict[str, str] = {}
    abilities: Optional[AbilityScores] = None
    skills: dict[str, str] = {}
    feats: list[str] = []
    environment: Optional[str] = None
    organization: Optional[str] = None
    challenge_rating: str = ""
    treasure: Optional[str] = None
    alignment: str = ""
    advancement: Optional[str] = None
    level_adjustment: Optional[str] = None
    source_book: Optional[str] = None
    source_page: Optional[int] = None


class SpellEntry(BaseModel):
    name: str
    school: str
    subschool: Optional[str] = None
    descriptor: Optional[str] = None
    level: str
    components: str
    casting_time: str
    range_text: str
    area_or_target: Optional[str] = None
    effect: Optional[str] = None
    duration: str
    saving_throw: str
    spell_resistance: str
    description: str
    source_book: Optional[str] = None
    source_page: Optional[int] = None


class FeatEntry(BaseModel):
    name: str
    feat_type: str = "General"
    prerequisites: list[str] = []
    benefit: str = ""
    normal: Optional[str] = None
    special: Optional[str] = None
    source_book: Optional[str] = None
    source_page: Optional[int] = None
