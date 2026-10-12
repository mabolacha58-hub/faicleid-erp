import { createBrowserRouter } from "react-router";
import Root from "./pages/Root";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Activate from "./pages/Activate";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Classes from "./pages/Classes";
import Subjects from "./pages/Subjects";
import Grades from "./pages/Grades";
import Attendance from "./pages/Attendance";
import Financial from "./pages/Financial";
import StudentReport from "./pages/StudentReport";
import UsersPage from "./pages/UsersPage";
import AuditLog from "./pages/AuditLog";
import Profile from "./pages/Profile";
import Pessoal from "./pages/Pessoal";
import ActivationKeys from "./pages/ActivationKeys";
import NotFound from "./pages/NotFound";
import GuardianPortal from "./pages/GuardianPortal";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Login },
      { path: "activate", Component: Activate },
      { path: "signup", Component: Signup },
      { path: "dashboard", Component: Dashboard },
      { path: "students", Component: Students },
      { path: "teachers", Component: Teachers },
      { path: "classes", Component: Classes },
      { path: "subjects", Component: Subjects },
      { path: "grades", Component: Grades },
      { path: "attendance", Component: Attendance },
      { path: "financial", Component: Financial },
      { path: "pessoal", Component: Pessoal },
      { path: "report/:studentId", Component: StudentReport },
      { path: "users", Component: UsersPage },
      { path: "audit", Component: AuditLog },
      { path: "activation-keys", Component: ActivationKeys },
      { path: "profile", Component: Profile },
      { path: "portal", Component: GuardianPortal },
      { path: "*", Component: NotFound },
    ],
  },
]);
