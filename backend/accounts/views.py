from django.contrib.auth import update_session_auth_hash
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import NotificationsFilter
from .models import CustomUser, Notifications
from .serializers import (
    ChangePasswordSerializer,
    CustomUserSerializer,
    NotificationsSerializer,
    RegisterUserSerializer,
)


class UserRegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = RegisterUserSerializer
    permission_classes = (AllowAny, )
    
class UserRetrieveUptade(generics.RetrieveUpdateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer
    
    def get_object(self):
        return self.queryset.get(id=self.request.user.pk)
    
    
class CustomChangePasswordView(APIView):
    serializer_class = ChangePasswordSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            user = request.user
            if user.check_password(serializer.data.get('old_password')):
                user.set_password(serializer.data.get('new_password'))
                user.save()
                update_session_auth_hash(request, user)
                return Response({'detail': 'Senha atualizada com sucesso.'}, status=status.HTTP_200_OK)
            
            return Response({'detail': 'Senha antiga incorreta.'}, status=status.HTTP_403_FORBIDDEN)
        return Response({"detail":serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    
class NotificationsListView(generics.ListAPIView):
    serializer_class = NotificationsSerializer
    filterset_class = NotificationsFilter
    
    def get_queryset(self):
        return Notifications.objects.filter(user=self.request.user.pk)

class NotificationsUpdateView(generics.UpdateAPIView):
    serializer_class = NotificationsSerializer
    
    def get_queryset(self):
        return Notifications.objects.filter(user=self.request.user.pk)