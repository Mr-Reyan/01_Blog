import pytest
from django.utils import timezone
from rest_framework import status

from blog.models import Post, Category

URL = "/api/v1/posts/"
pytestmark = pytest.mark.django_db


# ============================================================
# list / retrieve — visibility
# ============================================================

def test_list_anonymous_sees_only_published(api, published, draft):
    r = api.get(URL)
    assert r.status_code == 200
    assert isinstance(r.data, list)
    slugs = [p["slug"] for p in r.data]
    assert published.slug in slugs
    assert draft.slug not in slugs


def test_list_anonymous_empty_when_only_drafts(api, draft):
    r = api.get(URL)
    assert r.status_code == 200
    assert r.data == []


def test_retrieve_published_public(api, published):
    r = api.get(f"{URL}{published.slug}/")
    assert r.status_code == 200
    assert r.data["slug"] == published.slug


def test_retrieve_draft_404_anonymous(api, draft):
    assert api.get(f"{URL}{draft.slug}/").status_code == 404


def test_retrieve_draft_404_other_author(api, other_author, draft):
    api.force_authenticate(other_author)
    assert api.get(f"{URL}{draft.slug}/").status_code == 404


def test_retrieve_own_draft_ok(api, author, draft):
    api.force_authenticate(author)
    assert api.get(f"{URL}{draft.slug}/").status_code == 200


def test_retrieve_draft_admin_ok(api, admin, draft):
    api.force_authenticate(admin)
    assert api.get(f"{URL}{draft.slug}/").status_code == 200


# ============================================================
# list — ?mine=true
# ============================================================

def test_mine_returns_own_posts_all_statuses(api, author, draft, published):
    api.force_authenticate(author)
    r = api.get(f"{URL}?mine=true")
    slugs = [p["slug"] for p in r.data]
    assert draft.slug in slugs
    assert published.slug in slugs


def test_mine_excludes_others_posts(api, author, other_author):
    foreign = Post.objects.create(
        title="Foreign", body="x" * 20, author=other_author,
        status=Post.Status.PUBLISHED, published_at=timezone.now(),
    )
    api.force_authenticate(author)
    r = api.get(f"{URL}?mine=true")
    assert foreign.slug not in [p["slug"] for p in r.data]


def test_mine_with_author_param_ignored(api, author, other_author, published):
    """?mine=true ignores extra params; only shows caller's posts."""
    api.force_authenticate(author)
    r = api.get(f"{URL}?mine=true&author={other_author.id}")
    assert all(
        Post.objects.get(slug=p["slug"]).author_id == author.id for p in r.data
    )


def test_mine_anonymous_returns_nothing(api, draft, published):
    r = api.get(f"{URL}?mine=true")
    assert r.data == []


# ============================================================
# list — ?search
# ============================================================

def test_search_title(api, author):
    a = Post.objects.create(title="Django Tips", body="x" * 20, author=author,
                            status=Post.Status.PUBLISHED, published_at=timezone.now())
    b = Post.objects.create(title="Rust Notes", body="x" * 20, author=author,
                            status=Post.Status.PUBLISHED, published_at=timezone.now())
    r = api.get(f"{URL}?search=django")
    slugs = [p["slug"] for p in r.data]
    assert a.slug in slugs and b.slug not in slugs


def test_search_body(api, author):
    a = Post.objects.create(title="untitled", body="django content " + "x" * 20,
                            author=author, status=Post.Status.PUBLISHED,
                            published_at=timezone.now())
    r = api.get(f"{URL}?search=django")
    assert a.slug in [p["slug"] for p in r.data]


def test_search_empty_returns_all_published(api, published):
    r = api.get(f"{URL}?search=")
    assert published.slug in [p["slug"] for p in r.data]


# ============================================================
# list — ?category
# ============================================================

def test_filter_by_category(api, author, category):
    other = Category.objects.create(name="rust")
    a = Post.objects.create(title="A", body="x" * 20, author=author,
                            status=Post.Status.PUBLISHED, published_at=timezone.now())
    a.categories.add(category)
    b = Post.objects.create(title="B", body="x" * 20, author=author,
                            status=Post.Status.PUBLISHED, published_at=timezone.now())
    b.categories.add(other)
    r = api.get(f"{URL}?category=python")
    slugs = [p["slug"] for p in r.data]
    assert a.slug in slugs and b.slug not in slugs


def test_filter_by_unknown_category_returns_empty(api, published):
    r = api.get(f"{URL}?category=nope")
    assert r.data == []


# ============================================================
# create — always DRAFT
# ============================================================

def test_create_requires_auth(api):
    assert api.post(URL, {"title": "x", "body": "y" * 20}, format="json").status_code == 401


def test_create_success_returns_draft(api, author):
    api.force_authenticate(author)
    r = api.post(URL, {"title": "Hello", "body": "x" * 20}, format="json")
    assert r.status_code == 201
    p = Post.objects.get(slug=r.data["slug"])
    assert p.status == Post.Status.DRAFT
    assert p.published_at is None
    assert p.author_id == author.id


def test_create_ignores_client_author(api, author, other_author):
    api.force_authenticate(author)
    r = api.post(URL, {"title": "Hello", "body": "x" * 20,
                        "author": str(other_author.id)}, format="json")
    assert r.status_code == 201
    assert Post.objects.get(slug=r.data["slug"]).author_id == author.id


def test_create_ignores_client_status(api, author):
    """Client sends PUBLISHED — must be ignored, stays DRAFT."""
    api.force_authenticate(author)
    r = api.post(URL, {"title": "Hello", "body": "x" * 20,
                        "status": "PUBLISHED"}, format="json")
    assert r.status_code == 201
    p = Post.objects.get(slug=r.data["slug"])
    assert p.status == Post.Status.DRAFT
    assert p.published_at is None


def test_create_ignores_client_archived(api, author):
    api.force_authenticate(author)
    r = api.post(URL, {"title": "Hello", "body": "x" * 20,
                        "status": "ARCHIVED"}, format="json")
    assert r.status_code == 201
    assert Post.objects.get(slug=r.data["slug"]).status == Post.Status.DRAFT



def test_create_missing_title_400(api, author):
    api.force_authenticate(author)
    r = api.post(URL, {"body": "x" * 20}, format="json")
    assert r.status_code == 400 and "title" in r.data


def test_create_short_body_400(api, author):
    api.force_authenticate(author)
    r = api.post(URL, {"title": "Hello", "body": "short"}, format="json")
    assert r.status_code == 400 and "body" in r.data


# ============================================================
# update / partial_update
# ============================================================

def test_update_by_owner_ok(api, author, draft):
    api.force_authenticate(author)
    r = api.patch(f"{URL}{draft.slug}/", {"title": "Updated"}, format="json")
    assert r.status_code == 200
    draft.refresh_from_db()
    assert draft.title == "Updated"

def test_update_by_non_owner_published_403(api, other_author, published):
    """Published posts ARE visible; ownership check then fires → 403."""
    api.force_authenticate(other_author)
    assert api.patch(f"{URL}{published.slug}/", {"title": "hijack"}, format="json").status_code == 403


def test_update_by_non_owner_404(api, other_author, draft):
    """Drafts are invisible to non-authors → 404 not 403."""
    api.force_authenticate(other_author)
    assert api.patch(f"{URL}{draft.slug}/", {"title": "hijack"}, format="json").status_code == 404


def test_update_by_admin_ok(api, admin, draft):
    api.force_authenticate(admin)
    assert api.patch(f"{URL}{draft.slug}/", {"title": "moderated"}, format="json").status_code == 200


def test_update_cannot_change_status(api, author, draft):
    """Publishing must be via /publish/, not PATCH."""
    api.force_authenticate(author)
    api.patch(f"{URL}{draft.slug}/", {"status": "PUBLISHED"}, format="json")
    draft.refresh_from_db()
    assert draft.status == Post.Status.DRAFT


def test_update_cannot_change_slug(api, author, draft):
    api.force_authenticate(author)
    r = api.patch(f"{URL}{draft.slug}/", {"slug": "hijacked"}, format="json")
    assert r.status_code == 200
    assert r.data["slug"] == draft.slug   # unchanged


# ============================================================
# destroy
# ============================================================

def test_delete_by_owner_204(api, author, draft):
    api.force_authenticate(author)
    assert api.delete(f"{URL}{draft.slug}/").status_code == 204


def test_delete_by_non_owner_404(api, other_author, draft):
    api.force_authenticate(other_author)
    assert api.delete(f"{URL}{draft.slug}/").status_code == 404

def test_delete_by_non_owner_published_403(api, other_author, published):
    api.force_authenticate(other_author)
    assert api.delete(f"{URL}{published.slug}/").status_code == 403


def test_delete_by_admin_ok(api, admin, draft):
    api.force_authenticate(admin)
    assert api.delete(f"{URL}{draft.slug}/").status_code == 204


def test_delete_anonymous_401(api, draft):
    assert api.delete(f"{URL}{draft.slug}/").status_code == 401


# ============================================================
# publish action
# ============================================================

def test_publish_by_owner_ok(api, author, draft):
    api.force_authenticate(author)
    r = api.post(f"{URL}{draft.slug}/publish/")
    assert r.status_code == 200
    draft.refresh_from_db()
    assert draft.status == Post.Status.PUBLISHED
    assert draft.published_at is not None


def test_publish_twice_409(api, author, draft):
    api.force_authenticate(author)
    assert api.post(f"{URL}{draft.slug}/publish/").status_code == 200
    assert api.post(f"{URL}{draft.slug}/publish/").status_code == 409


def test_publish_by_non_owner_404(api, other_author, draft):
    api.force_authenticate(other_author)
    assert api.post(f"{URL}{draft.slug}/publish/").status_code == 404

def test_publish_by_non_owner_published_409(api, other_author, published):

    api.force_authenticate(other_author)
    assert api.post(f"{URL}{published.slug}/publish/").status_code == 409

def test_publish_by_admin_ok(api, admin, draft):
    api.force_authenticate(admin)
    assert api.post(f"{URL}{draft.slug}/publish/").status_code == 200


def test_publish_anonymous_401(api, draft):
    assert api.post(f"{URL}{draft.slug}/publish/").status_code == 401


def test_publish_nonexistent_404(api, author):
    api.force_authenticate(author)
    assert api.post(f"{URL}does-not-exist/publish/").status_code == 404