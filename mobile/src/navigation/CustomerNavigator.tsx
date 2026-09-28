import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';
import { TabBar } from '../components/shared/TabBar';
import DashboardScreen from '../screens/customer/DashboardScreen';
import ShipmentsScreen from '../screens/customer/ShipmentsScreen';
import ShipmentDetailScreen from '../screens/customer/ShipmentDetailScreen';
import TrackingScreen from '../screens/customer/TrackingScreen';
import InvoicesScreen from '../screens/customer/InvoicesScreen';
import NotificationsScreen from '../screens/customer/NotificationsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import SearchScreen from '../screens/shared/SearchScreen';
import DocumentsScreen from '../screens/admin/DocumentsScreen';
import ContainersScreen from '../screens/admin/ContainersScreen';
import ContainerDetailScreen from '../screens/admin/ContainerDetailScreen';

export type CustomerTabParamList = {
  Dashboard: undefined;
  Shipments: undefined;
  Tracking: undefined;
  Invoices: undefined;
  Workspace: undefined;
};

export type CustomerStackParamList = {
  Home: NavigatorScreenParams<CustomerTabParamList> | undefined;
  Search: undefined;
  ShipmentDetail: { id: string };
  Notifications: undefined;
  Documents: undefined;
  Containers: undefined;
  ContainerDetail: { id: string };
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createNativeStackNavigator<CustomerStackParamList>();

const CustomerTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Shipments" component={ShipmentsScreen} />
      <Tab.Screen name="Tracking" component={TrackingScreen} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} />
      <Tab.Screen name="Workspace" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const CustomerNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={CustomerTabs} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="ShipmentDetail" component={ShipmentDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="Containers" component={ContainersScreen} />
      <Stack.Screen name="ContainerDetail" component={ContainerDetailScreen} />
    </Stack.Navigator>
  );
};
