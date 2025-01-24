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

document.addEventListener('DOMContentLoaded', () => {
    const subtitleElement = document.getElementById('subtitle');
    const reportContainer = document.getElementById('report-container');
    const loadingElement = document.getElementById('loading');

    const currentPath = window.location.pathname;

    // `/reports/search/{키워드}` 페이지인지 확인
    if (currentPath.startsWith('/reports/search/')) {
        const keyword = decodeURIComponent(currentPath.split('/').pop());
        subtitleElement.textContent = `검색 결과: "${keyword}"`;

        let offset = 0;
        const limit = 30;
        let isFetching = false; // 중복 fetch 방지 플래그
        let hasMoreData = true; // 데이터가 더 있는지 여부

        const apiUrl = (offset, limit) =>
            `https://ssh-oci.duckdns.org/reports/search?keyword=${encodeURIComponent(keyword)}&offset=${offset}&limit=${limit}`;

        loadingElement.style.display = 'block';

        const fetchAndRenderData = () => {
            if (isFetching || !hasMoreData) return;

            isFetching = true; // fetch 중으로 설정
            fetch(apiUrl(offset, limit))
                .then(response => {
                    if (!response.ok) throw new Error('네트워크 응답에 문제가 있습니다.');
                    return response.json();
                })
                .then(data => {
                    if (data.length === 0) {
                        hasMoreData = false; // 더 이상 데이터 없음
                        if (offset === 0) {
                            reportContainer.innerHTML = '<p>검색 결과가 없습니다.</p>';
                        } else {
                            showEndOfResultsMessage();
                        }
                        return;
                    }

                    renderSearchResults(data);
                    offset += limit; // offset 증가
                })
                .catch(error => {
                    console.error('API 호출 중 오류 발생:', error);
                    if (offset === 0) {
                        reportContainer.innerHTML = '<p>검색 결과를 가져오는 데 실패했습니다.</p>';
                    }
                })
                .finally(() => {
                    isFetching = false; // fetch 완료
                    loadingElement.style.display = 'none';
                });
        };

        const renderSearchResults = (data) => {
            // 날짜별로 그룹화하여 정렬
            const sortedData = Object.entries(data).sort(([dateA], [dateB]) => {
                // 날짜 형식 확인 및 파싱
                const dateAParsed = new Date(dateA);
                const dateBParsed = new Date(dateB);
                return dateBParsed - dateAParsed;
            });
        
            sortedData.forEach(([date, companies]) => {
                const dateGroup = document.createElement('div');
                dateGroup.className = 'date-group';
        
                // 날짜 타이틀
                const dateTitle = document.createElement('div');
                dateTitle.className = 'date-title';
                dateTitle.textContent = date;
                dateGroup.appendChild(dateTitle);
        
                // 회사별로 리포트 표시
                Object.entries(companies).forEach(([company, reports]) => {
                    const companyGroup = document.createElement('div');
                    companyGroup.className = 'company-group';
        
                    // 회사 타이틀
                    const companyTitle = document.createElement('div');
                    companyTitle.className = 'company-title';
                    companyTitle.textContent = company;
                    companyGroup.appendChild(companyTitle);
        
                    // 리포트별로 표시
                    reports.forEach(report => {
                        const reportElement = document.createElement('div');
                        reportElement.className = 'report';
        
                        // 리포트 링크
                        const reportLink = document.createElement('a');
                        reportLink.href = report.link;
                        reportLink.target = '_blank';
                        reportLink.textContent = report.title;
        
                        // 작성자
                        const reportWriter = document.createElement('p');
                        reportWriter.textContent = `작성자: ${report.writer}`;
        
                        // 리포트 요소에 링크와 작성자를 추가
                        reportElement.appendChild(reportLink);
                        reportElement.appendChild(reportWriter);
        
                        companyGroup.appendChild(reportElement);
                    });
        
                    dateGroup.appendChild(companyGroup);
                });
        
                // 최종적으로 모든 내용을 컨테이너에 추가
                reportContainer.appendChild(dateGroup);
            });
        };
        
        const showEndOfResultsMessage = () => {
            const endMessage = document.createElement('div');
            endMessage.className = 'end-of-results';
            endMessage.textContent = '모든 데이터를 조회했습니다.';
            reportContainer.appendChild(endMessage);
        };

        // 무한 스크롤 이벤트 리스너
        window.addEventListener('scroll', () => {
            const scrollPosition = window.scrollY + window.innerHeight;
            const threshold = document.documentElement.scrollHeight * 0.6;

            if (scrollPosition > threshold) {
                fetchAndRenderData();
            }
        });

        // 초기 데이터 로드
        fetchAndRenderData();
        return; // 검색 페이지 전용 로직 이후 일반 페이지 로직 실행 방지
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
