import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import { SignIn } from "./pages/SignIn";
import {
    Navigate,
    Route,
    BrowserRouter as Router,
    Routes,
} from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import MyGroup from "./pages/MyGroup";
import Groups from "./pages/Groups";
import School from "./pages/School";
import Profile from "./pages/Profile";
import Grid from "./pages/Grid";
import CoursesAdmin from "./pages/CoursesAdmin";
import GroupDetail from "./pages/GroupDetail";

function App() {
    return (
        <>
            <AuthLoading>
                <h1>Loading...</h1>
            </AuthLoading>
            <Unauthenticated>
                <Router>
                    <Routes>
                        <Route
                            index
                            element={<Navigate to="/login" replace />}
                        />
                        <Route path="/login" element={<SignIn />} />
                    </Routes>
                </Router>
            </Unauthenticated>
            <Authenticated>
                <Router>
                    <Routes>
                        <Route element={<Layout />}>
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route index path="/dashboard" element={<Home />} />
                            <Route path="/my-group" element={<MyGroup />} />
                            <Route path="/groups" element={<Groups />} />
                            <Route
                                path="/groups/:groupId"
                                element={<GroupDetail />}
                            />
                            <Route path="/school" element={<School />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/courses-admin" element={<CoursesAdmin />} />
                            <Route path="/grid" element={<Grid />} />
                        </Route>
                    </Routes>
                </Router>
            </Authenticated>
        </>
    );
}

export default App;
