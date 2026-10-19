import pytest
from rest_framework import status

from blog.models import Comment, Post

pytestmark = pytest.mark.django_db


def _url(post_slug):
    return f"/api/v1/posts/{post_slug}/comments/"


def _detail_url(post_slug, comment_id):
    return f"/api/v1/posts/{post_slug}/comments/{comment_id}/"


# ============================================================
# list — public
# ============================================================

def test_list_comments_public(api, published, comment):
    r = api.get(_url(published.slug))
    assert r.status_code == 200
    assert isinstance(r.data, list)
    assert any(c["id"] == str(comment.id) for c in r.data)


def test_list_comments_empty(api, published):
    r = api.get(_url(published.slug))
    assert r.status_code == 200
    assert r.data == []


def test_list_comments_on_draft_404_anonymous(api, draft):
    assert api.get(_url(draft.slug)).status_code == 404


def test_list_comments_on_draft_404_other_author(api, other_author, draft):
    api.force_authenticate(other_author)
    assert api.get(_url(draft.slug)).status_code == 404


def test_list_comments_on_draft_200_owner(api, author, draft):
    api.force_authenticate(author)
    assert api.get(_url(draft.slug)).status_code == 200


def test_list_hides_invisible_comments(api, published, comment):
    comment.is_visible = False
    comment.save()
    r = api.get(_url(published.slug))
    assert all(c["id"] != str(comment.id) for c in r.data)


def test_list_unknown_post_404(api):
    assert api.get(_url("nope")).status_code == 404


# ============================================================
# create
# ============================================================

def test_create_requires_auth(api, published):
    assert api.post(_url(published.slug), {"body": "hi"}, format="json").status_code == 401


def test_create_success(api, other_author, published):
    api.force_authenticate(other_author)
    r = api.post(_url(published.slug), {"body": "nice"}, format="json")
    assert r.status_code == 201
    c = Comment.objects.get(pk=r.data["id"])
    assert c.body == "nice"
    assert c.author_id == other_author.id
    assert c.post_id == published.id


def test_create_ignores_client_author(api, other_author, author, published):
    api.force_authenticate(other_author)
    r = api.post(_url(published.slug),
                  {"body": "hi", "author": str(author.id)}, format="json")
    assert r.status_code == 201
    assert Comment.objects.get(pk=r.data["id"]).author_id == other_author.id


def test_create_ignores_client_post(api, other_author, published):
    """Client can't attach comment to a different post via payload."""
    other_post = Post.objects.create(
        title="Other", body="x" * 20, author=published.author,
        status=Post.Status.PUBLISHED, published_at=published.published_at,
    )
    api.force_authenticate(other_author)
    r = api.post(_url(published.slug),
                  {"body": "hi", "post": str(other_post.id)}, format="json")
    assert r.status_code == 201
    assert Comment.objects.get(pk=r.data["id"]).post_id == published.id


def test_create_on_draft_404_for_non_author(api, other_author, draft):
    api.force_authenticate(other_author)
    assert api.post(_url(draft.slug), {"body": "hi"}, format="json").status_code == 404


def test_create_on_draft_ok_for_owner(api, author, draft):
    """Author may comment on their own draft (409 path never fires)."""
    api.force_authenticate(author)
    r = api.post(_url(draft.slug), {"body": "note"}, format="json")
    assert r.status_code == 201


def test_create_empty_body_400(api, other_author, published):
    api.force_authenticate(other_author)
    r = api.post(_url(published.slug), {"body": ""}, format="json")
    assert r.status_code == 400 and "body" in r.data


def test_create_body_too_long_400(api, other_author, published):
    """Assumes CommentSerializer has max_length=500."""
    api.force_authenticate(other_author)
    r = api.post(_url(published.slug), {"body": "x" * 501}, format="json")
    assert r.status_code == 400 and "body" in r.data


def test_create_is_visible_ignored(api, other_author, published):
    """Client can't set is_visible=False (would hide own comment)."""
    api.force_authenticate(other_author)
    r = api.post(_url(published.slug),
                  {"body": "hi", "is_visible": False}, format="json")
    assert r.status_code == 201
    assert Comment.objects.get(pk=r.data["id"]).is_visible is True


# ============================================================
# destroy
# ============================================================

def test_delete_requires_auth(api, published, comment):
    assert api.delete(_detail_url(published.slug, comment.id)).status_code == 401


def test_delete_by_owner_204(api, comment):
    api.force_authenticate(comment.author)
    assert api.delete(_detail_url(comment.post.slug, comment.id)).status_code == 204


def test_delete_by_non_owner_403(api, author, published, comment):
    """`author` did not write `comment` (which belongs to `other_author`)."""
    api.force_authenticate(author)
    assert api.delete(_detail_url(published.slug, comment.id)).status_code == 403


def test_delete_by_admin_ok(api, admin, published, comment):
    api.force_authenticate(admin)
    assert api.delete(_detail_url(published.slug, comment.id)).status_code == 204


def test_delete_wrong_post_404(api, other_author, comment):
    """Comment belongs to `published`; deleting via a different post → 404."""
    other_post = Post.objects.create(
        title="Other", body="x" * 20, author=other_author,
        status=Post.Status.PUBLISHED,
    )
    api.force_authenticate(comment.author)
    assert api.delete(_detail_url(other_post.slug, comment.id)).status_code == 404


def test_delete_unknown_comment_404(api, other_author, published):
    import uuid
    api.force_authenticate(other_author)
    assert api.delete(_detail_url(published.slug, uuid.uuid4())).status_code == 404