// 검색 실행
function submitSearch() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) {
        alert("검색어를 입력해주세요.");
        return;
    }
    // `/reports/search/{키워드}`로 리다이렉션
    url = `/reports/search/${encodeURIComponent(query)}`;
    window.location.href = `/reports/search/${encodeURIComponent(query)}`;
}


// 검색 입력 필드에서 Enter 키 처리
document.getElementById("searchInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        submitSearch();
    }
});