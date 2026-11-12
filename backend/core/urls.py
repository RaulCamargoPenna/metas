from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

API_VERSION = 'v1'

urlpatterns = [
    path('admin/', admin.site.urls),
    path(f'api/{API_VERSION}/' , include("accounts.urls")),
    path(f'api/{API_VERSION}/', include("goals.urls")),
]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
