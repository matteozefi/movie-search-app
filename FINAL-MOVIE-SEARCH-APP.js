// Demo API key for portfolio purposes - in production, this would be stored securely as an environment variable
const API_KEY = "11900843";

//viewingStatus + stale-search tracking
let viewingWatchlist = false;
let lastSearchToken = 0;

//DOM Elements
const searchBtn = document.getElementById("search-button");
const watchlistBtn = document.getElementById("watchlist-button");
const movieContainer = document.getElementById("movies-container");
const searchInput = document.getElementById("search-input");
const watchlistCount = document.getElementById("watchlist-count");
const modal = document.getElementById("modal");
const modalCloseBtn = document.getElementById("modal-close-button");
const modalBody = document.getElementById("modal-body");

//Search Button Functionality
searchBtn.addEventListener("click", async () => {
    const searchTerm = searchInput.value.trim();
    if (searchTerm === "") {
        showError("Please enter a movie title to search.");
        return;
    } else {
        viewingWatchlist = false; // ✅ NEW
        searchMovies(searchTerm);
    }
});

searchInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
        searchBtn.click();
    }
});

//Show loading Spinner
const showLoading = () => {
    movieContainer.innerHTML = `
    <div class="spinner"></div>
    `;
};

//Show Error Message
const showError = (message) => {
    movieContainer.innerHTML = `
    <div class="error-message">${message}</div>
    `;
};

//Search Movies Function
const searchMovies = async (searchTerm) => {
    showLoading();

    // ✅ NEW: token prevents older search results from overwriting newer ones
    const token = ++lastSearchToken;

    try {
        const response = await fetch(
            "https://www.omdbapi.com/?apikey=" + API_KEY + "&s=" + encodeURIComponent(searchTerm)
        );

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();

        // ✅ NEW: ignore stale results
        if (token !== lastSearchToken) return;

        if (data.Response === "False") {
            showError(data.Error);
        } else {
            displayMovies(data.Search);
        }
    } catch (error) {
        showError(`An error occurred: ${error.message}`);
    }
};

//Display Movies Function
const displayMovies = async (movies) => {
    movieContainer.innerHTML = "";

    movies.forEach((movie) => {
        const movieCard = document.createElement("div");
        movieCard.classList.add("movie-card");

        // Helps instant removal when viewing watchlist
        movieCard.dataset.imdbid = movie.imdbID;

        // Handle missing posters
        const posterHTML =
            movie.Poster && movie.Poster !== "N/A"
                ? `<img src="${movie.Poster}" alt="${movie.Title}" class="movie-poster">`
                : `<div class="no-poster">No Poster Available</div>`;

        movieCard.innerHTML = `
            ${posterHTML}
            <div class="movie-details">
                <h3 class="movie-title">${movie.Title} (${movie.Year})</h3>
            </div>
        `;

        movieContainer.appendChild(movieCard);

        movieCard.addEventListener("click", async () => {
            // If this is already a full details object (watchlist items you saved from modal),
            // just show it without spending an API call
            if (movie && movie.Plot && movie.imdbRating) {
                showDetails(movie);
                return;
            }

            // Otherwise fetch full details only when needed
            modal.classList.add("show");
            modalBody.innerHTML = `<div class="spinner"></div>`;

            try {
                const movieDetails = await fetchMovieDetails(movie.imdbID);
                showDetails(movieDetails);
            } catch (error) {
                modalBody.innerHTML = `<div class="error-message">Could not load movie details.</div>`;
            }
        });
    });
};


//Fetch Movie Details Function
const fetchMovieDetails = async (imdbID) => {
    const response = await fetch("https://www.omdbapi.com/?apikey=" + API_KEY + "&i=" + imdbID);
    const data = await response.json();
    return data;
};

//Show Movie Details in Modal
const showDetails = (movie) => {
    modal.classList.add("show");
    modalBody.innerHTML = `
        <div class="modal-poster-container">
            <img src="${movie.Poster}" alt="${movie.Title}" class="modal-movie-poster">
        </div>
        <div class="modal-info-section">
            <h2 class="modal-movie-title">${movie.Title}</h2>
            <p class="horiz-flex" id="modal-specific">
                <span>${movie.Year}</span>
                <span>${movie.Rated}</span>
                <span>${movie.Runtime}</span>
            </p>
            <p><strong>⭐ IMDB Rating:</strong> ${movie.imdbRating}</p>
            <p>${movie.Plot}</p>
            <p><strong>Genre:</strong> ${movie.Genre}</p>
            <p><strong>Director:</strong> ${movie.Director}</p>
            <p><strong>Actors:</strong> ${movie.Actors}</p>
            <button id="add-to-watchlist">Add to Watchlist</button>
            <button id="remove-watchlist-item">Remove from Watchlist</button>
        </div>
    `;

    const addToWatchlistBtn = document.getElementById("add-to-watchlist");
    const removeFromWatchlistBtn = document.getElementById("remove-watchlist-item");

    if (isInWatchlist(movie.imdbID)) {
        addToWatchlistBtn.classList.add("none");
        removeFromWatchlistBtn.classList.add("show");
    } else {
        removeFromWatchlistBtn.classList.remove("show");
        addToWatchlistBtn.classList.remove("none");
    }

    addToWatchlistBtn.addEventListener("click", () => {
        addToWatchlist(movie);
        addToWatchlistBtn.classList.add("none");
        removeFromWatchlistBtn.classList.add("show");
        updateWatchlistCount();
    });

    removeFromWatchlistBtn.addEventListener("click", () => {
        removeFromWatchlist(movie);
        removeFromWatchlistBtn.classList.remove("show");
        addToWatchlistBtn.classList.remove("none");
        updateWatchlistCount();
    });
};

//Close Modal Functionality
modalCloseBtn.addEventListener("click", () => {
    modal.classList.remove("show");
});

//Close Modal on Outside Click
window.addEventListener("click", (event) => {
    if (event.target === modal) {
        modal.classList.remove("show");
    }
});

//Close Modal on Escape Key
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("show")) {
        modal.classList.remove("show");
    }
})

//Get Watchlist from localStorage
const getWatchlist = () => {
    const watchlist = localStorage.getItem("watchlist");
    return watchlist ? JSON.parse(watchlist) : [];
};

//Add to Watchlist Function
const addToWatchlist = (movie) => {
    const watchlist = getWatchlist();
    if (!watchlist.find((item) => item.imdbID === movie.imdbID)) {
        watchlist.push(movie);
        localStorage.setItem("watchlist", JSON.stringify(watchlist));
        updateWatchlistCount();
        alert(`"${movie.Title}" has been added to your watchlist.`);
    }
};

//Update Watchlist Count
const updateWatchlistCount = () => {
    const watchlist = getWatchlist();
    watchlistCount.textContent = watchlist.length;
};

//Display Watchlist Movies
watchlistBtn.addEventListener("click", () => {
    viewingWatchlist = true; // ✅ NEW
    const watchlist = getWatchlist();
    if (watchlist.length === 0) {
        showError("Your watchlist is empty. Add some movies!");
    } else {
        displayMovies(watchlist);
    }
});

//Check if Movie is in Watchlist
const isInWatchlist = (imdbID) => {
    const watchlist = getWatchlist();
    return watchlist.some((item) => item.imdbID === imdbID);
};

//Remove from Watchlist Function
const removeFromWatchlist = (movie) => {
    const watchlist = getWatchlist();
    const updatedWatchlist = watchlist.filter((item) => item.imdbID !== movie.imdbID);

    localStorage.setItem("watchlist", JSON.stringify(updatedWatchlist));
    updateWatchlistCount();
    alert(`"${movie.Title}" has been removed from your watchlist.`);

    // ✅ NEW: if currently viewing watchlist, update the UI immediately
    if (viewingWatchlist) {
        const card = document.querySelector(`.movie-card[data-imdbid="${movie.imdbID}"]`);
        if (card) card.remove();

        // If that was the last one, show empty message
        if (!movieContainer.querySelector(".movie-card")) {
            showError("Your watchlist is empty. Add some movies!");
        }
    }
};

//Close modal
const closeModal = () => {
    modal.classList.remove("show");
};

//Initial Watchlist Count Update
updateWatchlistCount();
displayMovies(getWatchlist());
