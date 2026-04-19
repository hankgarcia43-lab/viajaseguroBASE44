/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminConfig from './pages/AdminConfig';
import AdminDashboard from './pages/AdminDashboard';
import AdminIncidents from './pages/AdminIncidents';
import AdminKYC from './pages/AdminKYC';
import AdminPayments from './pages/AdminPayments';
import AdminRoutes from './pages/AdminRoutes';
import CreateRoute from './pages/CreateRoute';
import DriverActiveRides from './pages/DriverActiveRides';
import DriverDashboard from './pages/DriverDashboard';
import DriverEarnings from './pages/DriverEarnings';
import DriverFeed from './pages/DriverFeed';
import DriverHistory from './pages/DriverHistory';
import DriverOnboarding from './pages/DriverOnboarding';
import Landing from './pages/Landing';
import MyBookings from './pages/MyBookings';
import MyRoutes from './pages/MyRoutes';
import Notifications from './pages/Notifications';
import PassengerHistory from './pages/PassengerHistory';
import PaymentInstructions from './pages/PaymentInstructions';
import Profile from './pages/Profile';
import RateRide from './pages/RateRide';
import ReportIncident from './pages/ReportIncident';
import RequestRide from './pages/RequestRide';
import RouteDetails from './pages/RouteDetails';
import SearchRoutes from './pages/SearchRoutes';
import PasajeroVerificacion from './pages/PasajeroVerificacion';
import PassengerTicket from './pages/PassengerTicket';
import QuickRide from './pages/QuickRide';
import DriverQuickRequests from './pages/DriverQuickRequests';
import Soporte from './pages/Soporte';
import WelcomePasajero from './pages/WelcomePasajero';
import WelcomeChofer from './pages/WelcomeChofer';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminConfig": AdminConfig,
    "AdminDashboard": AdminDashboard,
    "AdminIncidents": AdminIncidents,
    "AdminKYC": AdminKYC,
    "AdminPayments": AdminPayments,
    "AdminRoutes": AdminRoutes,
    "CreateRoute": CreateRoute,
    "DriverActiveRides": DriverActiveRides,
    "DriverDashboard": DriverDashboard,
    "DriverEarnings": DriverEarnings,
    "DriverFeed": DriverFeed,
    "DriverHistory": DriverHistory,
    "DriverOnboarding": DriverOnboarding,
    "Landing": Landing,
    "MyBookings": MyBookings,
    "MyRoutes": MyRoutes,
    "Notifications": Notifications,
    "PassengerHistory": PassengerHistory,
    "PaymentInstructions": PaymentInstructions,
    "Profile": Profile,
    "RateRide": RateRide,
    "ReportIncident": ReportIncident,
    "RequestRide": RequestRide,
    "RouteDetails": RouteDetails,
    "SearchRoutes": SearchRoutes,
    "PasajeroVerificacion": PasajeroVerificacion,
    "PassengerTicket": PassengerTicket,
    "QuickRide": QuickRide,
    "DriverQuickRequests": DriverQuickRequests,
    "Soporte": Soporte,
    "WelcomePasajero": WelcomePasajero,
    "WelcomeChofer": WelcomeChofer,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};