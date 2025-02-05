import React, { useEffect, useState } from 'react';
import { Heart, Activity, Stethoscope } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip } from 'chart.js';
import mqtt from 'mqtt';
import { jsPDF } from "jspdf";

// Register Chart.js components
ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip);

// HiveMQ Cloud MQTT Configuration
const MQTT_BROKER = 'wss://796567340bfe4c9fb081137890c1b46f.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_TOPIC = 'esp32/health';
const MAX_DATA_POINTS = 100;

// HiveMQ Credentials
const MQTT_OPTIONS: mqtt.IClientOptions = {
  username: 'rajjamdar',
  password: '1212Raj+',
  protocolVersion: 4, // Instead of protocolId
};

function App() {
  const [heartRate, setHeartRate] = useState(0);
  const [spo2, setSpo2] = useState(0);
  const [ecgData, setEcgData] = useState(Array(MAX_DATA_POINTS).fill(0));
  const [prInterval, setPrInterval] = useState(0);
  const [qtInterval, setQtInterval] = useState(0);
  const [qrsDuration, setQrsDuration] = useState(0);
  const [stSegment, setStSegment] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('🔌 Connecting to HiveMQ Cloud...');

    const client = mqtt.connect(MQTT_BROKER, MQTT_OPTIONS);

    client.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      setIsConnected(true);
      setError('');
      client.subscribe(MQTT_TOPIC);
    });

    client.on('error', (err) => {
      console.error('❌ MQTT Connection Error:', err);
      setIsConnected(false);
      setError('MQTT Connection Failed');
    });

    client.on('message', (topic, message) => {
      console.log(`📩 Message received on ${topic}:`, message.toString());

      try {
        const data = JSON.parse(message.toString());
        setHeartRate(data.heart_rate || 0);
        setSpo2(data.spo2 || 0);
        setEcgData((prev) => [...prev.slice(1), data.ecg || 0]);

        // Calculate ECG Parameters here (just for illustration)
        const { pr, qt, qrs, st } = calculateECGParameters(data.ecg || 0);
        setPrInterval(pr);
        setQtInterval(qt);
        setQrsDuration(qrs);
        setStSegment(st);
      } catch (e) {
        console.error('⚠️ MQTT Message Parsing Error:', e);
      }
    });

    client.on('close', () => {
      console.log('🔌 Disconnected from MQTT broker');
      setIsConnected(false);
      setError('Disconnected from MQTT');
    });

    return () => {
      console.log('🔄 Cleaning up MQTT client');
      if (client.connected) {
        client.end();
      }
    };
  }, []);

  // Simulated function for ECG parameter calculation
  const calculateECGParameters = (ecgSignal: number) => {
    // Here you would process the ECG signal to find PR, QT, QRS, and ST values.
    // For illustration, we're returning random values.
    return {
      pr: Math.random() * 200, // Simulated PR interval in ms
      qt: Math.random() * 400, // Simulated QT interval in ms
      qrs: Math.random() * 100, // Simulated QRS duration in ms
      st: Math.random() * 50, // Simulated ST segment in mV
    };
  };

  const chartData = {
    labels: Array.from({ length: MAX_DATA_POINTS }, (_, i) => i.toString()),
    datasets: [
      {
        label: 'ECG',
        data: ecgData,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        fill: false,
      },
    ],
  };

  // Chart options to create an ECG-like grid
  const chartOptions = {
    responsive: true,
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)', // Light grid lines
          lineWidth: 1,
        },
        ticks: {
          display: false, // Hide x-axis labels
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)', // Light grid lines
          lineWidth: 1,
        },
        ticks: {
          beginAtZero: true,
          stepSize: 10,
          display: false, // Hide y-axis labels
        },
      },
    },
    plugins: {
      title: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    elements: {
      point: {
        radius: 0, // Hide points
      },
    },
  };

  // Function to download the chart as PDF
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text('ECG Data', 10, 10);

    // Make sure the canvas element exists and is of the correct type
    const chartCanvas = document.getElementById('ecgChart') as HTMLCanvasElement | null;

    if (chartCanvas) {
      const imgData = chartCanvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 10, 20, 180, 100);
      doc.save('ecg_data.pdf');
    } else {
      console.error('Chart canvas not found');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold">Health Monitoring Dashboard</h1>

      <div className="mt-2 flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full ${isConnected ? 'bg-green-200' : 'bg-red-200'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        {error && <span className="bg-yellow-200 px-3 py-1 rounded-full">{error}</span>}
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 rounded-lg shadow flex flex-col items-center">
          <Heart className="text-red-500 w-8 h-8" />
          <h2 className="text-xl">Heart Rate</h2>
          <p className="text-4xl font-bold">{heartRate} BPM</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow flex flex-col items-center">
          <Stethoscope className="text-blue-500 w-8 h-8" />
          <h2 className="text-xl">SpO2</h2>
          <p className="text-4xl font-bold">{spo2}%</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <Activity className="text-purple-500 w-8 h-8" />
        <h2 className="text-xl">ECG Monitor</h2>
        <Line id="ecgChart" data={chartData} options={chartOptions} />
        <button
          onClick={downloadPDF}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Download as PDF
        </button>
      </div>

      <div className="mt-6">
        <h2 className="text-xl">ECG Parameters</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow flex flex-col items-center">
            <p className="text-xl">PR Interval</p>
            <p className="text-2xl">{prInterval.toFixed(2)} ms</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow flex flex-col items-center">
            <p className="text-xl">QT Interval</p>
            <p className="text-2xl">{qtInterval.toFixed(2)} ms</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow flex flex-col items-center">
            <p className="text-xl">QRS Duration</p>
            <p className="text-2xl">{qrsDuration.toFixed(2)} ms</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow flex flex-col items-center">
            <p className="text-xl">ST Segment</p>
            <p className="text-2xl">{stSegment.toFixed(2)} mV</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;