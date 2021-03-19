import logging
import random
import re
import urllib
from string import ascii_lowercase, digits

from django.urls.exceptions import NoReverseMatch
from django.utils.encoding import escape_uri_path
from rest_framework import authentication
from rest_framework.request import Request
from django.conf import settings
from rest_framework.reverse import reverse

from api.models.User import User
from oidc_rp.models import OIDCUser


def get_login_uri(request: Request = None, next: str = None) -> str:
    uri = None
    if request:
        query_dictionary = {"next": next, "kc_idp_hint": settings.OIDC_RP_KC_IDP_HINT}
        query_dictionary = {k: v for k, v in query_dictionary.items() if v is not None}
        try:
            uri = "{base_url}?{querystring}".format(
                base_url=reverse("oidc_auth_request", request=request),
                querystring=urllib.parse.urlencode(query_dictionary),
            )
        except NoReverseMatch:
            pass
    return uri


def get_logout_uri(request: Request = None) -> str:
    uri = None
    if request:
        try:
            uri = reverse("oidc_end_session", request=request)
        except NoReverseMatch:
            pass
    return uri


def generate_random_username(
    length=16, chars=ascii_lowercase + digits, split=4, delimiter="-", prefix=""
):
    username = "".join([random.choice(chars) for i in range(length)])

    if split:
        username = delimiter.join(
            [
                username[start : start + split]
                for start in range(0, len(username), split)
            ]
        )
    username = prefix + username

    try:
        User.objects.get(username=username)
        return generate_random_username(
            length=length, chars=chars, split=split, delimiter=delimiter
        )
    except User.DoesNotExist:
        return username


def sync_keycloak_user(oidc_user: OIDCUser, claims: dict):
    """Copy attributes from JWT claims."""
    oidc_user.user.authorization_id = claims.get("sub")
    oidc_user.user.first_name = claims.get("given_name")
    oidc_user.user.last_name = claims.get("family_name")
    oidc_user.user.email = claims.get("email")
    oidc_user.user.save()


class DemoAuth(authentication.BaseAuthentication):
    """
    rest_framework authentication backend
    Authenticate a user based on an email address header submitted by the front-end
    """

    def __init__(self):
        self.__logger = logging.getLogger(__name__)

    def authenticate(self, request):
        if "HTTP_X_DEMO_LOGIN" in request.META:
            custom_email = request.META["HTTP_X_DEMO_LOGIN"]
        else:
            custom_email = request.COOKIES.get("x-demo-login")

        if custom_email and re.match(r"[\w\.\-\+]+@[\w\.\-]+\.\w+", custom_email):
            self.__logger.info("Authenticating demo login '%s'", custom_email)
            try:
                user = User.objects.get(email=custom_email)
            except User.DoesNotExist:
                username = generate_random_username()
                user = User.objects.create_user(
                    username=username,
                    email=custom_email,
                    password=None,
                    authorization_id=username,
                )
            result = (user, "demo")
        else:
            result = None

        return result
