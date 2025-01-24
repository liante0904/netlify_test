// 메뉴 토글
function toggleMenu() {
    const menuPanel = document.querySelector('.menu-panel');
    menuPanel.classList.toggle('open');
}

// 검색창 토글
function toggleSearch() {
    const overlay = document.getElementById("searchOverlay");
    const searchInput = document.getElementById("searchInput");

    if (overlay.style.display === "flex") {
        overlay.style.display = "none";
    } else {
        overlay.style.display = "flex";
        searchInput.focus(); // 검색창 열릴 때 자동 포커스
    }
}

// 검색 실행
function submitSearch() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) {
        alert("검색어를 입력해주세요.");
        return;
    }
    // `/reports/search/{키워드}`로 리다이렉션
    window.location.href = `/reports/search/${encodeURIComponent(query)}`;
}

// 검색 입력 필드에서 Enter 키 처리
document.getElementById("searchInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        submitSearch();
    }
});

function setupPaging(fetchDataCallback) {
    let offset = 0;
    let limit = 30;
    let isFetching = false;
    let hasMoreData = true;

    const fetchAndRenderData = () => {
        if (isFetching || !hasMoreData) return;

        isFetching = true;
        fetchDataCallback(offset, limit)
            .then(data => {
                if (data.length === 0) {
                    hasMoreData = false;
                    if (offset === 0) {
                        reportContainer.innerHTML = '<p>데이터가 없습니다.</p>';
                    } else {
                        showEndOfResultsMessage();
                    }
                } else {
                    renderSearchResults(data); // 데이터를 렌더링하는 함수
                    offset += limit; // offset 증가
                }
            })
            .catch(error => {
                console.error('데이터 로드 중 오류 발생:', error);
                if (offset === 0) {
                    reportContainer.innerHTML = '<p>데이터를 가져오는 데 실패했습니다.</p>';
                }
            })
            .finally(() => {
                isFetching = false;
                loadingElement.style.display = 'none';
            });
    };

    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY + window.innerHeight;
        const threshold = document.documentElement.scrollHeight * 0.6;

        if (scrollPosition > threshold) {
            fetchAndRenderData();
        }
    });

    // 초기 데이터 로드
    fetchAndRenderData();
}

document.addEventListener('DOMContentLoaded', () => {
    const subtitleElement = document.getElementById('subtitle');
    const reportContainer = document.getElementById('report-container');
    const loadingElement = document.getElementById('loading');

    const currentPath = window.location.pathname;

    // `/reports/search/{키워드}` 페이지인지 확인
    if (currentPath.startsWith('/reports/search/')) {
        const keyword = decodeURIComponent(currentPath.split('/').pop());
        subtitleElement.textContent = `검색 결과: "${keyword}"`;
    
        const apiUrl = (offset, limit) =>
            `https://ssh-oci.duckdns.org/reports/search?keyword=${encodeURIComponent(keyword)}&offset=${offset}&limit=${limit}`;
    
        setupPaging((offset, limit) => fetch(apiUrl(offset, limit)).then(response => response.json()));
    }


    // 기존 메뉴 페이지 처리
    const isDailyGroup = currentPath.includes('daily_group');
    const isDailyGlobal = currentPath.includes('daily_global');

    const jsonBaseUrl = isDailyGroup
        ? 'https://ssh-oci.duckdns.org/static/reports/daily_group_reports.json'
        : isDailyGlobal
            ? 'https://ssh-oci.duckdns.org/static/reports/daily_global_reports.json'
            : 'https://ssh-oci.duckdns.org/static/reports/recent_reports.json';

    const timestamp = new Date().getTime();
    const jsonUrl = `${jsonBaseUrl}?t=${timestamp}`;

    subtitleElement.textContent = isDailyGroup
        ? '현재 메뉴: 일자별 레포트 (그룹)'
        : isDailyGlobal
            ? '현재 메뉴: 일자별 레포트 (글로벌)'
            : '현재 메뉴: 최근 게시된 레포트';

    loadingElement.style.display = 'block';

    fetch(jsonUrl)
        .then(response => {
            if (!response.ok) throw new Error('네트워크 응답에 문제가 있습니다.');
            return response.json();
        })
        .then(data => {
            renderReports(data);
        })
        .catch(error => {
            console.error('JSON 데이터를 가져오는 중 오류 발생:', error);
            reportContainer.innerHTML = '<p>데이터를 가져오는 데 실패했습니다.</p>';
        })
        .finally(() => {
            loadingElement.style.display = 'none';
        });

    function renderReports(data) {
        reportContainer.innerHTML = '';

        const isIsoFormat = Object.keys(data)[0].includes('T');
        const sortedData = Object.entries(data).sort(([dateA], [dateB]) => {
            const dateAParsed = isIsoFormat
                ? new Date(dateA)
                : new Date(dateA.slice(0, 4) + '-' + dateA.slice(4, 6) + '-' + dateA.slice(6, 8));
            const dateBParsed = isIsoFormat
                ? new Date(dateB)
                : new Date(dateB.slice(0, 4) + '-' + dateB.slice(4, 6) + '-' + dateB.slice(6, 8));
            return dateBParsed - dateAParsed;
        });

        sortedData.forEach(([date, firms]) => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';

            const dateTitle = document.createElement('div');
            dateTitle.className = 'date-title';
            dateTitle.textContent = date;
            dateGroup.appendChild(dateTitle);

            Object.entries(firms).forEach(([firm, reports]) => {
                const companyGroup = document.createElement('div');
                companyGroup.className = 'company-group';

                const companyTitle = document.createElement('div');
                companyTitle.className = 'company-title';
                companyTitle.textContent = firm;
                companyGroup.appendChild(companyTitle);

                reports.forEach(report => {
                    const reportElement = document.createElement('div');
                    reportElement.className = 'report';

                    const reportLink = document.createElement('a');
                    reportLink.href = report.link;
                    reportLink.target = '_blank';
                    reportLink.textContent = report.title;

                    const reportWriter = document.createElement('p');
                    reportWriter.textContent = `작성자: ${report.writer}`;

                    reportElement.appendChild(reportLink);
                    reportElement.appendChild(reportWriter);
                    companyGroup.appendChild(reportElement);
                });

                dateGroup.appendChild(companyGroup);
            });

            reportContainer.appendChild(dateGroup);
        });
    }
});
