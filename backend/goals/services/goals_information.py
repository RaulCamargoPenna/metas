from django.db.models import BooleanField, Case, Count, Q, Value, When


def get_goals_information(queryset, request):
    return (
        queryset
        .select_related("user")
        .prefetch_related('tasks', 'likes')
        .annotate(
            total_tasks=Count('tasks', distinct=True),
            total_likes=Count('likes', distinct=True),
            already_liked=Case(
                When(likes__user=request.user, then=Value(True)),
                default=Value(False),
                output_field=BooleanField()
            ),
            completed_tasks=Count('tasks', filter=Q(tasks__completed=True), distinct=True)
        )
    )