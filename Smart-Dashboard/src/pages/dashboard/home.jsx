import { useEffect, useState } from "react";
import { Typography, Card, CardBody, Button } from "@material-tailwind/react";
import {
  BoltIcon,
  GlobeAmericasIcon,
  TruckIcon,
} from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";
import { getAccessToken, decodeJwt } from "@/services/authService";
import { fetchBuildingsData } from "@/services/snap/buildings";
import { fetchTrafficLights, fetchTrafficSensors } from "@/services/snap/traffic";
import { cardsConfig } from "@/configs/cards-config";
import { kpiConfig } from "@/configs/kpi-config";


export function Home() {
  const [envCount, setEnvCount] = useState(0);
  const [energyCount, setEnergyCount] = useState(0);
  const [trafficLightsCount, setTrafficLightsCount] = useState(0);
  const [trafficSensorsCount, setTrafficSensorsCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // ---------- GET USER ROLE ----------
  const token = getAccessToken();
  const decoded = decodeJwt(token);
  const userRole = decoded?.role || "guest";
  const userRoles = (decoded?.realm_access?.roles || [])
  .map(r => r.toLowerCase())
  .filter((v, i, arr) => arr.indexOf(v) === i); // remove duplicates

  //console.log("USER ROLES:", userRoles);
  
  //console.log("DECODEDJWT:", decoded);
  // ---------- ICON MAP ----------
  const icons = {
    energy: <BoltIcon className="h-10 w-10 text-yellow-600" />,
    environment: <GlobeAmericasIcon className="h-10 w-10 text-green-700" />,
    mobility: <TruckIcon className="h-10 w-10 text-red-600" />,
  };

  // ---------- FILTER CARDS BY USER ROLE ----------
  // console.log("USER ROLE IS:", userRole);
  // console.log("FILTERING CARDS FOR ROLES:", cardsConfig.map(c => c.roles));

  const visibleCards = cardsConfig.filter(card =>
    card.roles.some(role => userRoles.includes(role))
  );


  const visibleKpis = {
    environmentSensors: kpiConfig
      .find(k => k.id === "environmentSensors")
      .roles.some(role => userRoles.includes(role.toLowerCase())),

    energyMeters: kpiConfig
      .find(k => k.id === "energyMeters")
      .roles.some(role => userRoles.includes(role.toLowerCase())),

    trafficLights: kpiConfig
      .find(k => k.id === "trafficLights")
      .roles.some(role => userRoles.includes(role.toLowerCase())),

    trafficSensors: kpiConfig
      .find(k => k.id === "trafficSensors")
      .roles.some(role => userRoles.includes(role.toLowerCase())),
  };



  const loadData = async () => {
    setLoading(true);

    const minimumDelay = new Promise((resolve) =>
      setTimeout(resolve, 1500)
    );

    try {
      const [env, lights, sensors] = await Promise.all([
        fetchBuildingsData(),
        fetchTrafficLights(),
        fetchTrafficSensors(),
        minimumDelay,
      ]);

      setEnvCount(env.length);
      setEnergyCount(env.filter((e) => e.power_consumption !== null).length);
      setTrafficLightsCount(lights.length);
      setTrafficSensorsCount(sensors.length);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, []);

  const Skeleton = () => (
    <div className="animate-pulse">
      <div className="h-4 bg-blue-gray-200 rounded w-1/2 mb-3"></div>
      <div className="h-8 bg-blue-gray-300 rounded w-1/3"></div>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 space-y-10 w-full mx-auto max-w-7xl">

      {/* ---------- HEADER ---------- */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h2" color="blue-gray" className="font-bold">
            Smart City Dashboard
          </Typography>
          <Typography color="blue-gray" className="opacity-70 mt-1">
            Live insights into energy, environment & mobility across Rhodes.
          </Typography>
        </div>
      </div>

      {/* ---------- KPI CARDS ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        {/* ENVIRONMENT SENSORS */}
        {visibleKpis.environmentSensors && (
          <Card className="border border-blue-gray-100 shadow-sm p-4">
            <CardBody>
              <Typography variant="h6" color="blue-gray">
                Environment Sensors
              </Typography>
              {loading ? (
                <Skeleton />
              ) : (
                <Typography className="text-3xl font-bold text-blue-gray-800 mt-2">
                  {envCount}
                </Typography>
              )}
            </CardBody>
          </Card>
        )}

        {/* ENERGY METERS */}
        {visibleKpis.energyMeters && (
          <Card className="border border-blue-gray-100 shadow-sm p-4">
            <CardBody>
              <Typography variant="h6" color="blue-gray">
                Energy Meters
              </Typography>
              {loading ? (
                <Skeleton />
              ) : (
                <Typography className="text-3xl font-bold text-blue-gray-800 mt-2">
                  {energyCount}
                </Typography>
              )}
            </CardBody>
          </Card>
        )}

        {/* TRAFFIC LIGHTS */}
        {visibleKpis.trafficLights && (
          <Card className="border border-blue-gray-100 shadow-sm p-4">
            <CardBody>
              <Typography variant="h6" color="blue-gray">
                Traffic Lights
              </Typography>
              {loading ? (
                <Skeleton />
              ) : (
                <Typography className="text-3xl font-bold text-blue-gray-800 mt-2">
                  {trafficLightsCount}
                </Typography>
              )}
            </CardBody>
          </Card>
        )}

        {/* TRAFFIC SENSORS */}
        {visibleKpis.trafficSensors && (
          <Card className="border border-blue-gray-100 shadow-sm p-4">
            <CardBody>
              <Typography variant="h6" color="blue-gray">
                Traffic Sensors
              </Typography>
              {loading ? (
                <Skeleton />
              ) : (
                <Typography className="text-3xl font-bold text-blue-gray-800 mt-2">
                  {trafficSensorsCount}
                </Typography>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* ---------- FEATURE CARDS ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visibleCards.map((card) => (
          <Card 
            key={card.id} 
            className="p-6 border border-blue-gray-100 shadow-md hover:shadow-lg transition"
          >
            <div className="flex items-center gap-4">
              {icons[card.icon]}
              <div>
                <Typography variant="h5" className="font-bold">
                  {card.title}
                </Typography>
                <Typography color="gray" className="text-sm">
                  {card.description}
                </Typography>
              </div>
            </div>

            <Link to={card.path}>
              <Button color="blue-gray" className="mt-6" fullWidth>
                View {card.title}
              </Button>
            </Link>
          </Card>
        ))}
      </div>

    </div>
  );
}

export default Home;
