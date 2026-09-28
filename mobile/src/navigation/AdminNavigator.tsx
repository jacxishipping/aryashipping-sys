import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';
import { TabBar } from '../components/shared/TabBar';
import DashboardScreen from '../screens/admin/DashboardScreen';
import ShipmentsScreen from '../screens/admin/ShipmentsScreen';
import ShipmentDetailScreen from '../screens/admin/ShipmentDetailScreen';
import ShipmentCreateScreen from '../screens/admin/ShipmentCreateScreen';
import CustomersScreen from '../screens/admin/CustomersScreen';
import CustomerDetailScreen from '../screens/admin/CustomerDetailScreen';
import CustomerCreateScreen from '../screens/admin/CustomerCreateScreen';
import CustomerEditScreen from '../screens/admin/CustomerEditScreen';
import ContainersScreen from '../screens/admin/ContainersScreen';
import ContainerDetailScreen from '../screens/admin/ContainerDetailScreen';
import DispatchesScreen from '../screens/admin/DispatchesScreen';
import DispatchDetailScreen from '../screens/admin/DispatchDetailScreen';
import InvoicesScreen from '../screens/admin/InvoicesScreen';
import FinanceScreen from '../screens/admin/FinanceScreen';
import DocumentsScreen from '../screens/admin/DocumentsScreen';
import AnalyticsScreen from '../screens/admin/AnalyticsScreen';
import NotificationsScreen from '../screens/admin/NotificationsScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import PartnerPortalsScreen from '../screens/admin/PartnerPortalsScreen';
import BankingScreen from '../screens/admin/BankingScreen';
import CompanyLedgersScreen from '../screens/admin/CompanyLedgersScreen';
import TransitsScreen from '../screens/admin/TransitsScreen';
import UserDetailScreen from '../screens/admin/UserDetailScreen';
import PartnerPortalDetailScreen from '../screens/admin/PartnerPortalDetailScreen';
import PartnerPortalActivityScreen from '../screens/admin/PartnerPortalActivityScreen';
import TransitDetailScreen from '../screens/admin/TransitDetailScreen';
import CompanyLedgerDetailScreen from '../screens/admin/CompanyLedgerDetailScreen';
import UserCreateScreen from '../screens/admin/UserCreateScreen';
import UserEditScreen from '../screens/admin/UserEditScreen';
import PartnerPortalCreateScreen from '../screens/admin/PartnerPortalCreateScreen';
import PartnerPortalEditScreen from '../screens/admin/PartnerPortalEditScreen';
import FinanceReportsScreen from '../screens/admin/FinanceReportsScreen';
import SystemToolsScreen from '../screens/admin/SystemToolsScreen';
import SearchScreen from '../screens/shared/SearchScreen';
import { AgingReportScreen } from '../screens/admin';

export type AdminTabParamList = {
  Dashboard: undefined;
  Shipments: undefined;
  Customers: undefined;
  Workspace: undefined;
};

export type AdminStackParamList = {
  Home: NavigatorScreenParams<AdminTabParamList> | undefined;
  Search: undefined;
  ShipmentDetail: { id: string };
  ShipmentCreate: undefined;
  CustomerCreate: undefined;
  CustomerDetail: { id: string };
  CustomerEdit: { id: string };
  UserCreate: undefined;
  UserDetail: { id: string };
  UserEdit: { id: string };
  ContainerDetail: { id: string };
  TransitDetail: { id: string };
  DispatchDetail: { id: string };
  Containers: undefined;
  Dispatches: undefined;
  Invoices: undefined;
  Finance: undefined;
  FinanceReports: undefined;
  AgingReport: undefined;
  Banking: undefined;
  CompanyLedgers: undefined;
  CompanyLedgerDetail: { id: string };
  Documents: undefined;
  Analytics: undefined;
  Users: undefined;
  PartnerPortals: undefined;
  PartnerPortalCreate: undefined;
  PartnerPortalDetail: { id: string };
  PartnerPortalEdit: { id: string };
  PartnerPortalActivity: { portalId: string; portalName?: string };
  Transits: undefined;
  SystemTools: undefined;
  Notifications: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

const WorkspaceScreen = () => {
  return <SettingsScreen />;
};

const AdminTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Shipments" component={ShipmentsScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Workspace" component={WorkspaceScreen} />
    </Tab.Navigator>
  );
};

export const AdminNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={AdminTabs} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="ShipmentDetail" component={ShipmentDetailScreen} />
      <Stack.Screen name="ShipmentCreate" component={ShipmentCreateScreen} />
      <Stack.Screen name="CustomerCreate" component={CustomerCreateScreen} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <Stack.Screen name="CustomerEdit" component={CustomerEditScreen} />
      <Stack.Screen name="UserCreate" component={UserCreateScreen} />
      <Stack.Screen name="UserDetail" component={UserDetailScreen} />
      <Stack.Screen name="UserEdit" component={UserEditScreen} />
      <Stack.Screen name="Containers" component={ContainersScreen} />
      <Stack.Screen name="ContainerDetail" component={ContainerDetailScreen} />
      <Stack.Screen name="TransitDetail" component={TransitDetailScreen} />
      <Stack.Screen name="DispatchDetail" component={DispatchDetailScreen} />
      <Stack.Screen name="Dispatches" component={DispatchesScreen} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} />
      <Stack.Screen name="Finance" component={FinanceScreen} />
      <Stack.Screen name="FinanceReports" component={FinanceReportsScreen} />
      <Stack.Screen name="AgingReport" component={AgingReportScreen} />
      <Stack.Screen name="Banking" component={BankingScreen} />
      <Stack.Screen name="CompanyLedgers" component={CompanyLedgersScreen} />
      <Stack.Screen name="CompanyLedgerDetail" component={CompanyLedgerDetailScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Users" component={UsersScreen} />
      <Stack.Screen name="PartnerPortalCreate" component={PartnerPortalCreateScreen} />
      <Stack.Screen name="PartnerPortals" component={PartnerPortalsScreen} />
      <Stack.Screen name="PartnerPortalDetail" component={PartnerPortalDetailScreen} />
      <Stack.Screen name="PartnerPortalEdit" component={PartnerPortalEditScreen} />
      <Stack.Screen name="PartnerPortalActivity" component={PartnerPortalActivityScreen} />
      <Stack.Screen name="Transits" component={TransitsScreen} />
      <Stack.Screen name="SystemTools" component={SystemToolsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};
