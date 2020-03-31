"""
    REST API Documentation for Family Protection Order

    OpenAPI spec version: v1


    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
"""

from django.urls import include, path
from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.schemas import SchemaGenerator
from rest_framework.views import APIView

# from rest_framework.urlpatterns import format_suffix_patterns
from rest_framework_swagger import renderers

# generated views
from . import views

# custom views

from . import survey


class SwaggerSchemaView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [renderers.OpenAPIRenderer, renderers.SwaggerUIRenderer]
    _ignore_model_permissions = True
    exclude_from_schema = True

    def get(self, request):
        generator = SchemaGenerator()
        schema = generator.get_schema(request=request)
        return Response(schema)


urlpatterns = [
    # Swagger documentation
    # url(r'^$', SwaggerSchemaView.as_view()),
    path("accept-terms/", views.AcceptTermsView.as_view()),
    path("survey-result/<collection>/<type>", survey.SurveyResultView.as_view()),
    path("survey-result/<collection>/<type>/<id>", survey.SurveyResultView.as_view()),
    path("survey-print/<collection>/<type>", views.SurveyPdfView.as_view()),
    path("user-info/", views.UserStatusView.as_view()),
]

if settings.OIDC_ENABLED:
    urlpatterns.append(path("oidc/", include("oidc_rp.urls")))

# urlpatterns = format_suffix_patterns(urlpatterns)
