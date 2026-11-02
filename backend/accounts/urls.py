from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import CustomChangePasswordView, UserRegisterView, UserRetrieveUptade

app_name = 'accounts'

urlpatterns = [
    path("register", UserRegisterView.as_view(), name='register'),
    path('token', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('user', UserRetrieveUptade.as_view(), name='user_details'),
    path('change/password', CustomChangePasswordView.as_view(), name='change_password'),
]