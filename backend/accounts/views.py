from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import CustomUser
from .serializers import RegisterUserSerializer


class UserRegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = RegisterUserSerializer
    permission_classes = (AllowAny, )