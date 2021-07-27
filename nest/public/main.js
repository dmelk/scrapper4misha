let start = (name) => {
    const xhttp = new XMLHttpRequest();
    xhttp.onload = function() {
        setTimeout(
            () => {
                getStatus(name)
            },
            1000, // 1 sec
        )
    };
    xhttp.open("POST", `api/${name}`);
    xhttp.send();
    document.getElementById(`${name}Btn`).setAttribute('disabled', true);
}

let getStatus = (name) => {
    const xhttp = new XMLHttpRequest();
    xhttp.onload = function() {
        const response = JSON.parse(this.responseText);
        if (response.statusCode) {
            // do nothing
            document.getElementById(`${name}Status`).innerHTML = 'Not started yet';
            document.getElementById(`${name}Btn`).removeAttribute('disabled');
            return;
        }
        const completed = response.status === 'completed';
        document.getElementById(`${name}Status`).innerHTML = (completed)? 'Completed' : 'In progress' ;
        document.getElementById(`${name}ProcessedVal`).innerHTML = response.processed;

        document.getElementById(`${name}StartedVal`).innerHTML =
            moment(new Date(response.started))
                .format('HH:mm:ss DD.MM.YYYY');

        if (response.finished !== '') {
            document.getElementById(`${name}FinishedVal`).innerHTML =
                moment(new Date(response.finished))
                    .format('HH:mm:ss DD.MM.YYYY');
        }

        if (response.path !== '') {
            document.getElementById(`${name}DownloadWrapper`).classList.remove('hidden');
            document.getElementById(`${name}Download`).href = '/api/xls/'.concat(response.path)
        }

        if (!completed) {
            setTimeout(
                () => {
                    getStatus(name)
                },
                5000, // 1 sec
            )
        } else {
            document.getElementById(`${name}Btn`).removeAttribute('disabled');
        }
    }
    xhttp.open("GET", `api/${name}.json`);
    xhttp.send();
}

getStatus('dinamoto');
getStatus('motocrazytown');
getStatus('motodom');

new mdc.dataTable.MDCDataTable(document.querySelector('.mdc-data-table'));
new mdc.ripple.MDCRipple(document.querySelector('.mdc-button'));
