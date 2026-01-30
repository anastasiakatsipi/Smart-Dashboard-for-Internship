import {
  Card,
  Input,
  Checkbox,
  Button,
  Typography,
} from "@material-tailwind/react";
import { Link } from "react-router-dom";
import React, { useState } from "react";
import { useAuth } from "../../auth";
import { useNavigate } from "react-router-dom";


export function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");
const [remember, setRemember] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login({
        username,
        password,
        client_id: clientId,
        client_secret: clientSecret,
        remember,
      });
      navigate("/dashboard/home");
    } catch (err) {
      console.error("Login error:", err?.response?.data || err);
      setError("Λάθος στοιχεία ή πρόβλημα σύνδεσης.");
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center gap-4">

        {/* LEFT SIDE - FORM */}
        <div className="w-full lg:w-3/5">
          <div className="text-center mb-6">
            <Typography variant="h2" className="font-bold mb-4">Sign In</Typography>
            <Typography variant="paragraph" color="blue-gray" className="text-lg font-normal">
              Enter your email and password to Sign In.
            </Typography>
          </div>

          <form className="mt-4 mb-2 mx-auto w-80 max-w-screen-lg lg:w-1/2" onSubmit={handleSubmit}>
            <div className="mb-1 flex flex-col gap-6">
              {/* Username */}
              <Typography variant="small" color="blue-gray" className="-mb-3 font-medium">
                Your username
              </Typography>
              <Input
                size="lg"
                placeholder="username"
                value={username}
                className=" !border-t-blue-gray-200 focus:!border-t-gray-900"
                labelProps={{ className: "before:content-none after:content-none" }}
                onChange={(e) => setUsername(e.target.value)}
              />

              {/* Password */}
              <Typography variant="small" color="blue-gray" className="-mb-3 font-medium">
                Password
              </Typography>
              <Input
                type="password"
                size="lg"
                placeholder="********"
                value={password}
                className=" !border-t-blue-gray-200 focus:!border-t-gray-900"
                labelProps={{ className: "before:content-none after:content-none" }}
                onChange={(e) => setPassword(e.target.value)}
              />

              {/* Client ID */}
              <Typography variant="small" color="blue-gray" className="-mb-3 font-medium">
                Client ID
              </Typography>
              <Input
                size="lg"
                placeholder="client_id"
                value={clientId}
                className=" !border-t-blue-gray-200 focus:!border-t-gray-900"
                labelProps={{ className: "before:content-none after:content-none" }}
                onChange={(e) => setClientId(e.target.value)}
              />

              {/* Client Secret */}
              <Typography variant="small" color="blue-gray" className="-mb-3 font-medium">
                Client Secret
              </Typography>
              <Input
                type="password"
                size="lg"
                placeholder="********"
                value={clientSecret}
                className=" !border-t-blue-gray-200 focus:!border-t-gray-900"
                labelProps={{ className: "before:content-none after:content-none" }}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>

            {/* Remember me */}
            <Checkbox
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              label="Remember me"
            />

            {/* Error message */}
            {error && (
              <Typography variant="small" color="red" className="text-center mt-2">
                {error}
              </Typography>
            )}

            {/* Button */}
            <Button type="submit" className="mt-6" fullWidth>
              Sign In
            </Button>

            {/* <Typography variant="paragraph" className="text-center text-blue-gray-500 font-medium mt-4">
              Not registered?
              <Link to="/auth/sign-up" className="text-gray-900 ml-1">Create account</Link>
            </Typography> */}
          </form>
        </div>

        {/* RIGHT IMAGE */}
        <div className="w-full lg:w-2/5 hidden lg:block">
          <img
            src="/img/pattern.png"
            className="h-full w-full object-cover rounded-3xl"
          />
        </div>

      </div>
    </section>

  );
}

export default SignIn;
