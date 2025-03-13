// Initialize Socket.IO connection
const socket = io();

// Initialize Chart.js
const ctx = document.getElementById('dataChart').getContext('2d');
const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Engine Room Temp (°C)',
                borderColor: 'red',
                data: [],
                yAxisID: 'temp'
            },
            {
                label: 'Outside Temp (°C)',
                borderColor: 'orange',
                data: [],
                yAxisID: 'temp'
            },
            {
                label: 'Main Cabin Temp (°C)',
                borderColor: 'yellow',
                data: [],
                yAxisID: 'temp'
            },
            {
                label: 'RPM',
                borderColor: 'blue',
                data: [],
                yAxisID: 'rpm'
            },
            {
                label: 'Humidity (%)',
                borderColor: 'green',
                data: [],
                yAxisID: 'percent'
            },
            {
                label: 'Pressure (hPa)',
                borderColor: 'purple',
                data: [],
                yAxisID: 'pressure'
            }
        ]
    },
    options: {
        responsive: true,
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                max: 100,
                title: {
                    display: true,
                    text: 'Time (s)'
                }
            },
            temp: {
                type: 'linear',
                position: 'left',
                min: 0,
                max: 100,
                title: {
                    display: true,
                    text: 'Temperature (°C)'
                }
            },
            rpm: {
                type: 'linear',
                position: 'right',
                min: 0,
                max: 4000,
                title: {
                    display: true,
                    text: 'RPM'
                }
            },
            percent: {
                type: 'linear',
                position: 'right',
                min: 0,
                max: 100,
                title: {
                    display: true,
                    text: 'Percentage'
                }
            },
            pressure: {
                type: 'linear',
                position: 'right',
                min: 900,
                max: 1100,
                title: {
                    display: true,
                    text: 'Pressure (hPa)'
                }
            }
        }
    }
});

// Update chart with new data
function updateChart(data) {
    const now = Date.now();

    chart.data.labels.push(now);

    // Update each dataset
    if (data.temperatures) {
        chart.data.datasets[0].data.push(data.temperatures[0] || null);
        chart.data.datasets[1].data.push(data.temperatures[1] || null);
        chart.data.datasets[2].data.push(data.temperatures[2] || null);
    }

    if (data.rpm !== undefined) {
        chart.data.datasets[3].data.push(data.rpm);
    }

    if (data.humidity !== undefined) {
        chart.data.datasets[4].data.push(data.humidity);
    }

    if (data.pressure !== undefined) {
        chart.data.datasets[5].data.push(data.pressure);
    }

    // Keep only last 100 points
    if (chart.data.labels.length > 100) {
        chart.data.labels.shift();
        chart.data.datasets.forEach(dataset => dataset.data.shift());
    }

    chart.update();
}

// Handle temperature sliders
document.querySelectorAll('.temp-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
        const instance = e.target.dataset.instance;
        const value = parseFloat(e.target.value);
        document.getElementById(`temp-value-${instance}`).textContent = value.toFixed(1);
    });

    slider.addEventListener('change', (e) => {
        socket.emit('temperature', {
            temp: parseFloat(e.target.value),
            instance: parseInt(e.target.dataset.instance),
            source: parseInt(e.target.dataset.source)
        });
    });
});

// Handle engine parameter sliders
const rpmSlider = document.getElementById('rpm-slider');
rpmSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('rpm-value').textContent = value;
});

rpmSlider.addEventListener('change', (e) => {
    const rpm = parseInt(e.target.value);
    socket.emit('rpm', {
        rpm: rpm,
        engineSpeed: Math.round((rpm / 4000) * 100),
        boostPressure: Math.round(rpm / 40),
        tiltTrim: 0
    });
});

// Handle environmental parameter sliders
const humiditySlider = document.getElementById('humidity-slider');
const pressureSlider = document.getElementById('pressure-slider');

humiditySlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('humidity-value').textContent = value;
});

pressureSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('pressure-value').textContent = value;
});

function sendEnvironmentalData() {
    socket.emit('environmental', {
        instance: 0,
        humidity: parseInt(humiditySlider.value),
        pressure: parseInt(pressureSlider.value)
    });
}

humiditySlider.addEventListener('change', sendEnvironmentalData);
pressureSlider.addEventListener('change', sendEnvironmentalData);

// Handle incoming data
socket.on('temperature_update', (data) => {
    const { temp, instance, source } = data;
    const element = document.getElementById(`temp-value-${instance}`);
    if (element) {
        element.textContent = temp.toFixed(1);
        document.querySelector(`.temp-slider[data-instance="${instance}"]`).value = temp;
    }
    updateChart({ temperatures: { [instance]: temp } });
});

socket.on('engine_update', (data) => {
    const { rpm, engineSpeed, boostPressure, tiltTrim } = data;
    document.getElementById('rpm-value').textContent = Math.round(rpm);
    document.getElementById('engine-speed-value').textContent = engineSpeed;
    document.getElementById('boost-pressure-value').textContent = boostPressure;
    document.getElementById('tilt-trim-value').textContent = tiltTrim;
    rpmSlider.value = rpm;
    updateChart({ rpm });
});

socket.on('environmental_update', (data) => {
    const { humidity, pressure } = data;
    document.getElementById('humidity-value').textContent = Math.round(humidity);
    document.getElementById('pressure-value').textContent = Math.round(pressure);
    humiditySlider.value = humidity;
    pressureSlider.value = pressure;
    updateChart({ humidity, pressure });
});