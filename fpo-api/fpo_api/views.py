from django.http import HttpResponse
from api.models.User import User


def health(request):
    """
    Health check for OpenShift
    """
    return HttpResponse(User.objects.count())
