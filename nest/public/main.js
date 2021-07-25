let dinamotoStatus = document.getElementById('dinamotoStatus');

let startDinamoto = () => {
    const xhttp = new XMLHttpRequest();
    xhttp.onload = function() {
        setTimeout(
            () => {
                getDinamoto()
            },
            1000, // 1 sec
        )
    };
    xhttp.open("POST", "api/dinamoto");
    xhttp.send();
    document.getElementById('dinamotoBtn').setAttribute('disabled', true);
}

let getDinamoto = () => {
    const xhttp = new XMLHttpRequest();
    xhttp.onload = function() {
        const response = JSON.parse(this.responseText);
        if (response.statusCode) {
            // do nothing
            dinamotoStatus.innerHTML = 'Not started yet';
            document.getElementById('dinamotoBtn').removeAttribute('disabled');
            return;
        }
        const completed = response.status === 'completed';
            dinamotoStatus.innerHTML = (completed)? 'Completed' : 'In progress' ;
        document.getElementById('dinamotoProcessedVal').innerHTML = response.processed;

        document.getElementById('dinamotoStartedVal').innerHTML =
            moment(new Date(response.started))
                .format('HH:mm:ss DD.MM.YYYY');

        if (response.finished !== '') {
            document.getElementById('dinamotoFinishedVal').innerHTML =
                moment(new Date(response.finished))
                    .format('HH:mm:ss DD.MM.YYYY');
        }

        if (response.path !== '') {
            document.getElementById('dinamotoDownloadWrapper').classList.remove('hidden');
            document.getElementById('dinamotoDownload').href = '/api/xls/'.concat(response.path)
        }

        if (!completed) {
            setTimeout(
                () => {
                    getDinamoto()
                },
                5000, // 1 sec
            )
        } else {
            document.getElementById('dinamotoBtn').removeAttribute('disabled');
        }
    }
    xhttp.open("GET", "api/dinamoto.json");
    xhttp.send();
}

getDinamoto();

new mdc.dataTable.MDCDataTable(document.querySelector('.mdc-data-table'));
new mdc.ripple.MDCRipple(document.querySelector('.mdc-button'));
