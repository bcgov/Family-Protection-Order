from django import template

from api.auth import get_login_uri, get_logout_uri

register = template.Library()


@register.simple_tag
def login_uri(request=None):
    if request:
        return get_login_uri(request, request.build_absolute_uri())


@register.simple_tag
def logout_uri(request=None):
    return get_logout_uri(request)
