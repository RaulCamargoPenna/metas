import uuid

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

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
        
class GoalsEndpointTest(APITestCase):
    
    @classmethod
    def setUpTestData(cls):
        cls.user = CustomUser.objects.create(username='Test', password='1234')
        cls.user.set_password('1234')
        cls.user.save()
        cls.goal = Goals.objects.create(name='Meta teste', description='Meta teste', user=cls.user)
        cls.task_goal = Tasks.objects.create(name='Tarefa', goal=cls.goal, description='teste')
        
        cls.user_2 = CustomUser.objects.create(username='Test-2', password='1234')
        cls.user_2.set_password('1234')
        cls.user_2.save()
        cls.goal_2 = Goals.objects.create(name='Meta teste', description='Meta teste', user=cls.user_2)
        cls.task_goal_2 = Tasks.objects.create(name='Tarefa', goal=cls.goal_2, description='teste')
    
    def test_whithout_auth(self):
        url = reverse('goals:goals')
        response = self.client.get(url, {})
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        data = {'name': 'teste', 'description': 'teste'}
        
        post_response = self.client.post(url, data)
        
        self.assertEqual(post_response.status_code, status.HTTP_401_UNAUTHORIZED) 
        
    def test_list_gols(self):        
        auth_url = reverse("accounts:token_obtain_pair")
        login = self.client.post(auth_url, {'username': 'Test', 'password': '1234'})

        url = reverse('goals:goals')
        response = self.client.get(
            url, 
            headers={
                "Authorization": f"Bearer {login.json().get('access')}"
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json().get('results')), 1)
        
    def test_block_update_goals_user(self):
        auth_url = reverse("accounts:token_obtain_pair")
        login = self.client.post(auth_url, {'username': 'Test', 'password': '1234'})
        
        url = reverse('goals:goals_details', kwargs={"pk": str(self.goal.pk)})
        response = self.client.patch(
            path=url,
            data={
                "user": self.user_2.pk
            },
            headers={
                "Authorization": f"Bearer {login.json().get("access")}"
            }
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue("user" in response.json())
    
    def test_unauthorized_request(self):
        auth_url = reverse("accounts:token_obtain_pair")
        login = self.client.post(auth_url, {'username': 'Test', 'password': '1234'})
        
        url = reverse('goals:goals_details', kwargs={"pk": str(self.goal_2.pk)})
        
        headers={
            "Authorization": f"Bearer {login.json().get("access")}"
        }
        
        get = self.client.get(url, headers=headers)
        patch = self.client.patch(
            path=url,
            data={
                "name": "editado pelo user A"
            },
            headers=headers
        )
        delete = self.client.delete(url, headers=headers)
        
        self.assertEqual(get.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(patch.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(delete.status_code, status.HTTP_404_NOT_FOUND)