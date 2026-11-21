import uuid
from django.core.cache import cache

def invalidate_public_goals():
    cache.set("public-goals:revision", uuid.uuid4().hex, timeout=None)