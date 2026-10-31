from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from core.urls import API_VERSION


class AuthTestCases(APITestCase):
        
    def test_create_existent_username(self):
        
        CustomUser.objects.create(username='Test12', password='1234')
        
        url = reverse('accounts:register')
        data={"username": 'Test12', 'password': '123'}
        
        response = self.client.post(url, data, format='json')
       
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CustomUser.objects.count(), 1)
        
    def test_create_user(self):
        
        url = reverse('accounts:register')
        data={"username": 'Test12', 'password': '123'}
        
        response = self.client.post(url, data, format='json')
       
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CustomUser.objects.count(), 1)
        
    def test_generate_tokens(self):
        user = CustomUser.objects.create(username='Test12', password='1234')
        user.set_password("1234")
        user.save()

        url = reverse('accounts:token_obtain_pair')
        data = {"username": 'Test12', 'password': '1234'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, 'access')
        self.assertContains(response, 'refresh')
        
    def test_generate_new_tokens(self):
        user = CustomUser.objects.create(username='Test12', password='1234')
        user.set_password("1234")
        user.save()

        url = reverse('accounts:token_obtain_pair')
        data = {"username": 'Test12', 'password': '1234'}
        
        response = self.client.post(url, data, format='json')
        
        refresh_url = reverse("accounts:token_refresh")
        data_refresh = {"refresh": response.json().get("refresh")}
        response_refresh = self.client.post(refresh_url, data_refresh, format='json')

        self.assertContains(response_refresh, 'access')