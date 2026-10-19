from django.db.models import Q
from .models import Post


def visible_posts_for(user):
    """
    Canonical post visibility rule.
    - admin: every post
    - authenticated: published + own posts (all statuses)
    - anonymous: published only
    """
    qs = Post.objects.all()
    if user.is_authenticated and user.is_admin():
        return qs
    if user.is_authenticated:
        return qs.filter(Q(status=Post.Status.PUBLISHED) | Q(author=user))
    return qs.filter(status=Post.Status.PUBLISHED)