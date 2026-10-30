from django.test import TestCase

from accounts.models import CustomUser
from goals.models import Goals, Tasks


class UserGoalsTestCase(TestCase):
    
    @classmethod
    def setUpTestData(cls):
        cls.user = CustomUser.objects.create(username='Test', password='1234')
        cls.goal = Goals.objects.create(name='Meta teste', description='Meta teste', user=cls.user)
        cls.task_goal = Tasks.objects.create(name='Tarefa', goal=cls.goal, description='teste')
        
        cls.user_2 = CustomUser.objects.create(username='Test-2', password='1234')
        cls.goal_2 = Goals.objects.create(name='Meta teste', description='Meta teste', user=cls.user_2)
        cls.task_goal_2 = Tasks.objects.create(name='Tarefa', goal=cls.goal_2, description='teste')
        
    def test_relations(self):
        """
            Testa integridadae dos relacionamentos.
        """
        user = CustomUser.objects.get(username='Test')
        task_user_1 = Tasks.objects.get(id=self.task_goal.pk)
        
        self.assertEqual(user, task_user_1.goal.user)
        
        user_2 = CustomUser.objects.get(username='Test-2')
        task_user_2 = Tasks.objects.get(id=self.task_goal_2.pk)
        
        self.assertEqual(user_2, task_user_2.goal.user)
        
    def test_cascade_effect(self):
        """
            Testa o caso de modelo CASCATA para exclusão
        """
        user_pk = self.user.pk
        self.user.delete()
        self.assertEqual(Goals.objects.filter(user_id=user_pk).count(), 0)
        self.assertEqual(Tasks.objects.filter(goal__user_id=user_pk).count(), 0)
        
        self.assertEqual(Goals.objects.filter(user_id=self.user_2).count(), 1)
        self.assertEqual(Tasks.objects.filter(goal__user_id=self.user_2).count(), 1)