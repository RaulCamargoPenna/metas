from django.urls import path

from goals.views import (
    GoalsListCreateView,
    GoalsRetrieveUpdateDelete,
    PublicGoals,
    PublicGoalsDetails,
    TasksListCreateView,
    TasksRetrieveUpdateDelete,
)

app_name = 'goals'

urlpatterns = [
    path("goals", GoalsListCreateView.as_view(), name='goals'),
    path("goals/<str:pk>", GoalsRetrieveUpdateDelete.as_view(), name='goals_details'),
    path("tasks", TasksListCreateView.as_view(), name='tasks'),
    path("tasks/<str:pk>", TasksRetrieveUpdateDelete.as_view(), name='tasks_details'),
    path("feed", PublicGoals.as_view(), name='feed'),
    path("public/goal/<str:pk>", PublicGoalsDetails.as_view(), name='public_goal'),
]
