from django.db import IntegrityError, transaction
from rest_framework import generics
from rest_framework.views import APIView, Response
from django.core.cache import cache
import hashlib

from .services.goals_information import get_goals_information
from .services.cache_invalidation import invalidate_public_goals
from accounts.services.register_notification import notify
from goals.filters import CommentsFilter, GoalsFilter, TasksFilter
from goals.models import Comments, Goals, Likes, Tasks
from goals.serializers import (
    CommentsSerializer,
    GoalsSerializer,
    LikesSerializer,
    PublicGoalsSerializer,
    TasksSerializer,
)


class GoalsListCreateView(generics.ListCreateAPIView):
    filterset_class = GoalsFilter
    def get_queryset(self):
        return Goals.objects.filter(user=self.request.user).select_related("user").order_by('-created_at')
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return PublicGoalsSerializer
        return GoalsSerializer
    
    def perform_create(self, serializer):
        return serializer.save(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        queryset = get_goals_information(queryset=queryset, request=request)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
class GoalsRetrieveUpdateDelete(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GoalsSerializer
    
    def get_queryset(self):
        return get_goals_information(queryset=Goals.objects.filter(public=True), request=self.request)

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return PublicGoalsSerializer
        return GoalsSerializer
    
class TasksListCreateView(generics.ListCreateAPIView):
    serializer_class = TasksSerializer
    filterset_class = TasksFilter
    
    def get_queryset(self):
        return Tasks.objects.filter(goal__user=self.request.user)

class TasksRetrieveUpdateDelete(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TasksSerializer
    
    def get_queryset(self):
        return Tasks.objects.filter(goal__user=self.request.user)

class PublicGoals(generics.ListAPIView):
    serializer_class = PublicGoalsSerializer
    filterset_class = GoalsFilter
    
    def get_queryset(self):
        return Goals.objects.filter(public=True).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        revision = cache.get("public-goals:revision") or 'initial'
        url = hashlib.sha256(request.build_absolute_uri().encode()).hexdigest()
        key = f"public-goals:{revision}:user:{request.user.pk}:{url}"

        data = cache.get(key)
        
        if data is not None:
            return Response(data)
        
        queryset = self.filter_queryset(self.get_queryset())
        queryset = get_goals_information(queryset=queryset, request=request)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            information = self.get_paginated_response(serializer.data)
        else:
            information = self.get_serializer(queryset, many=True)
            
        response = Response(information.data)
        cache.set(key, response.data, timeout=60)
        return response
    
class PublicGoalsDetails(generics.RetrieveAPIView):
    serializer_class = PublicGoalsSerializer
    
    def get_queryset(self):
        return get_goals_information(queryset=Goals.objects.filter(public=True), request=self.request)
    
class LikesCreateDeleteView(APIView):
    serializer_class = LikesSerializer
    
    def post(self, request, pk):
        data = {
            'goal': pk,
        }
        try:
            with transaction.atomic():
                serializer = self.serializer_class(data=data)
                if serializer.is_valid():
                    instancia = serializer.save(user=request.user)
                    context = {"detail": 'Success.'}
                    status = 201
                    
                    transaction.on_commit(invalidate_public_goals)

                    if instancia.goal.user != request.user:
                        notify(
                            user_instance=instancia.goal.user,
                            description=f'{request.user.username} liked your goal {instancia.goal.name}'
                        )


                else:
                    context = {"detail": "Erro processing like.", "errors": serializer.errors}
                    status = 400
        except IntegrityError as e:
            context = {"detail": str(e)}
            status = 400
            
        return Response(context, status=status)
        
        
    def delete(self, request, pk):
        queryset = Likes.objects.filter(goal=pk, user=request.user)
        if queryset.exists():
            queryset.delete()
            transaction.on_commit(invalidate_public_goals)
            context = {}
            status = 204
        else:
            context = {"detail": 'Not found'}
            status = 404
            
        return Response(context, status=status)
    
class CommentsListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentsSerializer
    filterset_class = CommentsFilter
    
    def get_queryset(self):
        return Comments.objects.filter(goal__public=True)
    
    def perform_create(self, serializer):
        return serializer.save(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        goal_id = request.data.get("goal")
        query = Goals.objects.filter(id=goal_id, public=True)
        if not query.exists():
            return Response({'detail': 'Public Goal not found'}, status=404)
        
        instancia = query.first()
        if instancia.user != request.user:
            notify(
                user_instance=instancia.user,
                description=f'{request.user.username} commented your goal {instancia.name}'
            )
        
        return super().create(request, *args, **kwargs)
    
class CommentsRetrieveUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CommentsSerializer
    filterset_class = CommentsFilter
    
    def get_queryset(self):
        return Comments.objects.filter(goal__public=True, user=self.request.user)