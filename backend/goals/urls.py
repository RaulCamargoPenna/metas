from django.urls import path

from goals.views import GoalsListCreateView, GoalsRetrieveUpdateDelete

app_name = 'goals'

urlpatterns = [
    path("goals", GoalsListCreateView.as_view(), name='goals'),
    path("goals/<str:pk>", GoalsRetrieveUpdateDelete.as_view(), name='goals_details'),
]
