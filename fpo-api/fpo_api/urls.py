"""
Definition of urls for fpo_api.
"""

from django.urls import include, path
from django.views.generic import RedirectView
from . import views

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = [
    path("", RedirectView.as_view(url="api/v1/user-info/")),
    path("api/v1/", include("api.urls")),
    path("health/", views.health),
]
