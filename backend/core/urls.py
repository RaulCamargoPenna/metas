from django.contrib import admin
from django.urls import include, path

API_VERSION = 'v1'

urlpatterns = [
    path('admin/', admin.site.urls),
    path(f'api/{API_VERSION}/' , include("accounts.urls")),
    path(f'api/{API_VERSION}/', include("goals.urls")),
]
