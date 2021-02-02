const frDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const frMonths = ["Janv", "Fév", "Mars", "Avril", "Mai", "Juin", "Juil", "Aout", "Sept", "Oct", "Nov", "Déc"];
const frMonthsFull = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Décembre"];
var dayPickerListener = false;
var cityToLatLng = [];

document.querySelector("#map").style.top = "-600px";
initializeMap();

function beginFetch(str) {
    if (!document.querySelector("#map").classList.contains("d-none")) {
        document.querySelector("#map").style.top = "-600px";
        setTimeout(function () {
            document.querySelector("#map").classList.add("d-none");
            document.querySelector("#menu > div > div.input-group-prepend > button").classList.add("btn-outline-secondary");
            document.querySelector("#menu > div > div.input-group-prepend > button").classList.remove("btn-secondary");
        }, 700);
    }
    if (str.split(" ").length > 1) {
        str = str.split(" ")[1];
    }
    if (document.querySelector("#current-day") !== null) {
        document.querySelector("#current-day").removeAttribute("id");
        document.querySelector("body > div.container > div.container.day-picker > div > div:nth-child(1)").id = "current-day";
    }
    let lowerCaseStr = str.toLowerCase();
    str = removeAccents(str).toLowerCase();
    setTimeout(function () {
        L.mapquest.geocoding().geocode(str);
    }, 700);

    fetch("https://www.prevision-meteo.ch/services/json/" + str)
        .then((response) => {
            if (response.ok) {
                return response.text();
            } else {
                console.log("Mauvaise réponse du réseau");
            }
        })
        .then((data) => {
            document.querySelector("#menu > div > div.input-group-append > button > i").classList.remove("fa-search");
            document.querySelector("#menu > div > div.input-group-append > button > i").classList.add("fa-redo");
            document.querySelector("#menu > div > div.input-group-append > button > i").setAttribute("title", "Recharger");
            data = JSON.parse(data);
            if (data.errors !== undefined && cityToLatLng[lowerCaseStr] !== undefined) {
                beginFetchWithLatLng(capitalized(lowerCaseStr), cityToLatLng[lowerCaseStr].lat, cityToLatLng[lowerCaseStr].lng);
            } else {
                displayForecast(data, capitalized(lowerCaseStr));
            }
        });
}

function search() {
    if (document.querySelector("input").value !== "" && document.querySelector("input").value.replace(/\s/g, "").length) {
        beginFetch(document.querySelector("input").value.trimStart().trimEnd());
    }
}

document.querySelector("#menu > div > div.input-group-append > button").addEventListener("click", search);
document.querySelector("input").addEventListener("keypress", function (e) {
    document.querySelector("#menu > div > div.input-group-append > button > i").classList.add("fa-search");
    document.querySelector("#menu > div > div.input-group-append > button > i").classList.remove("fa-redo");
    document.querySelector("#menu > div > div.input-group-append > button > i").setAttribute("title", "Rechercher");

    if (e.key === "Enter") {
        search();
    }
});

function displayForecast(data, city) {
    var currentTime = new Date();
    var currentHour = currentTime.getHours() + ":" + currentTime.getMinutes();
    if (currentTime.getHours() < 10) currentHour = "0" + currentHour;
    if (currentTime.getMinutes() < 10) currentHour = currentHour.split(":")[0] + ":0" + currentTime.getMinutes();

    if (data.errors !== undefined && cityToLatLng[removeAccents(city.toLowerCase())] === undefined) {
        if (!document.querySelector("#displayedWeather").classList.contains("d-none")) document.querySelector("#displayedWeather").classList.add("d-none");

        if (!document.querySelector(".day-picker").classList.contains("d-none")) document.querySelector(".day-picker").classList.add("d-none");

        while (document.querySelector(".time-picker > div").children.length !== 0) document.querySelector(".time-picker > div").removeChild(document.querySelector(".time-picker > div").lastChild);

        document.querySelector(".toast").classList.remove("d-none");
        $(".toast").toast("show");
        document.querySelector(".toast-body").innerHTML = data.errors[0].text + " : <span class='font-weight-bold'>" + document.querySelector("input").value + "</span> </br>Essayez de chercher la ville en utilisant la carte";
        setTimeout(function () {
            document.querySelector(".toast").classList.add("d-none");
        }, 2500);
    } else {
        let title = frDays[mod(currentTime.getDay() - 1, 7)] + " " + currentTime.getDate() + " " + frMonthsFull[currentTime.getMonth()] + " à " + currentHour + ", " + city;

        setDisplayedWeather(title, data.current_condition.tmp, data.current_condition.condition, data.current_condition.icon, data.current_condition.wnd_spd);

        if (document.querySelector("#displayedWeather").classList.contains("d-none")) document.querySelector("#displayedWeather").classList.remove("d-none");

        while (document.querySelector(".time-picker > div").children.length !== 0) document.querySelector(".time-picker > div").removeChild(document.querySelector(".time-picker > div").lastChild);

        while (document.querySelector(".day-picker > div").children.length !== 0) document.querySelector(".day-picker > div").removeChild(document.querySelector(".day-picker > div").lastChild);

        setTimePicker(data, data.fcst_day_0, currentTime);

        for (let i = 1; i <= 5; i++) {
            let specificDayPicker = document.createElement("div");
            specificDayPicker.classList.add("col", "rounded");
            specificDayPicker.setAttribute("data-day", i - 1);
            if (i === 1) {
                specificDayPicker.id = "current-day";
            }
            specificDayPicker.appendChild(document.createElement("span"));
            document.querySelector(".day-picker > div").appendChild(specificDayPicker);
        }

        for (let i = 1; i <= 5; i++) {
            document.querySelector(".day-picker > div > div:nth-child(" + i + ") > span").innerHTML = frDays[mod(currentTime.getDay() - 1, 7)].substr(0, 3) + " " + currentTime.getDate() + " " + frMonths[currentTime.getMonth()];
            currentTime.setDate(currentTime.getDate() + 1);
        }

        for (let j = 1; j <= 5; j++) {
            document.querySelector(".day-picker > div > div:nth-child(" + j + ")").addEventListener("click", function () {
                if (this.id !== "current-day") {
                    document.querySelector("#current-day").removeAttribute("id");
                    this.id = "current-day";

                    setTimePicker(data, data["fcst_day_" + this.getAttribute("data-day")], currentTime);

                    if (this.getAttribute("data-day") === "0") {
                        setDisplayedWeather(
                            frDays[mod(parseInt(currentTime.getDay()) + parseInt(this.getAttribute("data-day")) + 1, 7)] +
                                " " +
                                this.innerHTML.split(" ")[1] +
                                " " +
                                frMonthsFull[currentTime.getMonth()] +
                                " à " +
                                currentHour +
                                ", " +
                                document.querySelector("#displayedWeather > h2").innerHTML.split(", ")[1],
                            document.querySelector("#current-hour > div:nth-child(2)").textContent,
                            document.querySelector("#current-hour > div:nth-child(2) img").title,
                            document.querySelector("#current-hour > div:nth-child(2) img").src,
                            document.querySelector("#current-hour > div:nth-child(3) span:nth-child(2)").innerHTML.split(" ")[0]
                        );
                    } else {
                        setDisplayedWeather(
                            frDays[mod(parseInt(currentTime.getDay()) + parseInt(this.getAttribute("data-day")) + 1, 7)] +
                                " " +
                                this.innerHTML.split(" ")[1] +
                                " " +
                                frMonthsFull[currentTime.getMonth()] +
                                " à " +
                                currentHour.split(":")[0] +
                                "H" +
                                ", " +
                                document.querySelector("#displayedWeather > h2").innerHTML.split(", ")[1],
                            data["fcst_day_" + this.getAttribute("data-day")].hourly_data[currentTime.getHours() + "H00"].TMP2m,
                            data["fcst_day_" + this.getAttribute("data-day")].hourly_data[currentTime.getHours() + "H00"].CONDITION,
                            data["fcst_day_" + this.getAttribute("data-day")].hourly_data[currentTime.getHours() + "H00"].ICON,
                            data["fcst_day_" + this.getAttribute("data-day")].hourly_data[currentTime.getHours() + "H00"].WNDSPD10m
                        );
                    }
                }
            });
        }

        if (document.querySelector(".day-picker").classList.contains("d-none")) document.querySelector(".day-picker").classList.remove("d-none");
    }
}

function specificDailyHourClick() {
    document.querySelector("#current-hour").removeAttribute("id");
    this.id = "current-hour";

    setDisplayedWeather(
        document.querySelector("#displayedWeather h2").innerHTML.replace(document.querySelector("#displayedWeather h2").innerHTML.split("à ")[1].split(",")[0], this.querySelector("div:nth-child(1)").innerHTML),
        this.querySelector("div:nth-child(2)").textContent,
        this.querySelector("div:nth-child(2) img").title,
        this.querySelector("div:nth-child(2) img").src,
        this.querySelector("div:nth-child(3) span:nth-child(2)").innerHTML.split(" ")[0]
    );
}

function setDisplayedWeather(time, temperature, condition, conditionIco, windSpeed) {
    document.querySelector("#displayedWeather > h2").innerHTML = time;
    document.querySelector("#displayedWeather > div > div.col-sm.align-middle > span:nth-child(2)").innerHTML = temperature + "°C";
    document.querySelector("#displayedWeather > div > div:nth-child(2) > div > div > div:nth-child(1) > img").src = conditionIco;
    document.querySelector("#displayedWeather > div > div:nth-child(2) > div > div > div:nth-child(1) > img").alt = condition;
    document.querySelector("#displayedWeather > div > div:nth-child(2) > div > div > div:nth-child(3)").innerHTML = condition;
    document.querySelector("#displayedWeather > div > div:nth-child(3) > span:nth-child(2)").innerHTML = windSpeed + " km/h";
}

function setTimePicker(data, fcst_data, currentTime) {
    while (document.querySelector(".time-picker > div").children.length !== 0) document.querySelector(".time-picker > div").removeChild(document.querySelector(".time-picker > div").lastChild);

    for (let i = 0; i < 24; i++) {
        let divWrapper = createTimePicker(i, currentTime, fcst_data.hourly_data[i + "H00"].TMP2m, fcst_data.hourly_data[i + "H00"].ICON, fcst_data.hourly_data[i + "H00"].CONDITION, fcst_data.hourly_data[i + "H00"].WNDSPD10m);
        document.querySelector(".time-picker div").appendChild(divWrapper);
    }

    if (document.querySelector("#current-day") === document.querySelector("body > div:nth-child(1) > div.container.day-picker > div > div:nth-child(1)")) {
        let divToInsertAfter = document.querySelector("#current-hour");
        document.querySelector("#current-hour").removeAttribute("id");

        var currentHour = currentTime.getHours() + ":" + currentTime.getMinutes();
        if (currentTime.getHours() < 10) currentHour = "0" + currentHour;
        if (currentTime.getMinutes() < 10) currentHour = currentHour.split(":")[0] + ":0" + currentTime.getMinutes();

        let divWrapper = createTimePicker(currentHour, currentTime, data.current_condition.tmp, data.current_condition.icon, data.current_condition.condition, data.current_condition.wnd_spd);
        divWrapper.setAttribute("id", "current-hour");

        document.querySelector(".time-picker div").insertBefore(divWrapper, divToInsertAfter.nextSibling);
    }

    document.querySelector("#current-hour").scrollIntoView({
        behavior: "smooth",
    });
}

function initializeMap() {
    L.mapquest.key = "En9PUN8UwzuPTV7rNa8CZ7GAYpZmLvWp";
    // personal key, get your own key @ https://developer.mapquest.com 
	
    var map = L.mapquest.map("map", {
        center: [44.84044, -0.5805],
        layers: L.mapquest.tileLayer("map"),
        zoom: 12,
    });

    var customIcon = L.mapquest.icons.circle({
        primaryColor: "#3b5998",
    });

    var locatorControl = L.mapquest.locatorControl();
    map.addControl(L.mapquest.locatorControl());

    map.on("click", function (e) {
        document.querySelector("#map").style.top = "-600px";
        setTimeout(function () {
            document.querySelector("#map").classList.add("d-none");
            document.querySelector("#menu > div > div.input-group-prepend > button").classList.add("btn-outline-secondary");
            document.querySelector("#menu > div > div.input-group-prepend > button").classList.remove("btn-secondary");
        }, 700);

        L.mapquest.geocoding().reverse(e.latlng, getCity);
    });
}

function getCity(error, response) {
    const location = response.results[0].locations[0];
    document.querySelector("input").value = location.adminArea5;
    setTimeout(function () {
        beginFetchWithLatLng(location.adminArea5, response.results[0].providedLocation.latLng.lat, response.results[0].providedLocation.latLng.lng);
    }, 500);
}

function beginFetchWithLatLng(city, lat, lng) {
    fetch("https://www.prevision-meteo.ch/services/json/lat=" + lat + "lng=" + lng)
        .then((response) => {
            if (response.ok) {
                return response.text();
            } else {
                console.log("Mauvaise réponse du réseau");
            }
        })
        .then((data) => {
            cityToLatLng[city.toLowerCase()] = {
                lat: lat,
                lng: lng,
            };
            displayForecast(JSON.parse(data), city);

            document.querySelector("#menu > div > div.input-group-append > button > i").classList.remove("fa-search");
            document.querySelector("#menu > div > div.input-group-append > button > i").classList.add("fa-redo");
            document.querySelector("#menu > div > div.input-group-append > button > i").setAttribute("title", "Recharger");
            if (document.querySelector("#displayedWeather > h2").innerHTML.includes("NA")) {
                document.querySelector("#displayedWeather > h2").innerHTML = document.querySelector("#displayedWeather > h2").innerHTML.split("NA")[0] + city;
            }
        });
}

function resizeMap() {
    document.querySelector("#map").style.left = (window.innerWidth - document.querySelector("#map").offsetWidth) / 2 + "px";
}

window.addEventListener("resize", resizeMap);

document.querySelector("#menu > div > div.input-group-prepend > button").addEventListener("click", function () {
    if (document.querySelector("#map").classList.contains("d-none")) {
        document.querySelector("#map").classList.remove("d-none");
        document.querySelector("#menu > div > div.input-group-prepend > button").classList.remove("btn-outline-secondary");
        document.querySelector("#menu > div > div.input-group-prepend > button").classList.add("btn-secondary");
        resizeMap();
        document.querySelector("#map").style.top = "60px";
    } else {
        document.querySelector("#map").style.top = "-600px";
        setTimeout(function () {
            document.querySelector("#map").classList.add("d-none");
            document.querySelector("#menu > div > div.input-group-prepend > button").classList.add("btn-outline-secondary");
            document.querySelector("#menu > div > div.input-group-prepend > button").classList.remove("btn-secondary");
        }, 700);
    }
});

window.onload = function () {
    document.querySelector("#map").classList.add("d-none");
};

function createTimePicker(i, currentTime, temp, ico, condition, wndspd) {
    let divWrapper = document.createElement("div");

    divWrapper.classList.add("daily-hours", "border-top");
    if (i == currentTime.getHours()) divWrapper.id = "current-hour";

    if (i == 0) divWrapper.classList.add("rounded-top-left");
    else if (i == 23) divWrapper.classList.add("rounded-top-right");
    else divWrapper.classList.add("border-right", "border-left");

    let divHour = document.createElement("div");

    if (!String(i).includes(":")) divHour.innerHTML = i + "H";
    else divHour.innerHTML = i;

    let temperature = document.createElement("div");
    temperature.innerHTML = temp;
    let temperatureIco = document.createElement("img");
    temperatureIco.src = ico;
    temperatureIco.title = condition;
    temperatureIco.alt = condition;
    temperature.appendChild(temperatureIco);
    let wind = document.createElement("div");
    let windTxtSpan = document.createElement("span");
    windTxtSpan.innerHTML = wndspd + " km/h";
    let windIco = document.createElement("i");
    windIco.classList.add("fas", "fa-wind");
    let windIcoSpan = document.createElement("span");
    windIcoSpan.appendChild(windIco);
    wind.appendChild(windIcoSpan);
    wind.appendChild(windTxtSpan);
    divWrapper.appendChild(divHour);
    divWrapper.appendChild(temperature);
    divWrapper.appendChild(wind);
    divWrapper.addEventListener("click", specificDailyHourClick);
    return divWrapper;
}
