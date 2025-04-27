const axios = require('axios');


const API_BASE_URL = 'https://api.yclients.com/api/v1';
const COMPANY_ID = 187983;
const AUTH_HEADERS = {
    Accept: 'application/vnd.yclients.v2+json',
    'Content-Type': 'application/json',
    Authorization: 'Bearer rkcrcjc46u6bszexzwdk, User e78e5e5f43d73c56de0d240d34a33dc5',
};

const inputData = {
    phone: '79123456789',
    name: 'Олег',
    service_name: 'Мужская стрижка',
    master_name: 'Сергей',
    date: '2025-04-29',
    time: '16:30',
};

async function recordClient(input) {
    try {
        const datetime = `${input.date}T${input.time}:00`;

        // 1. Поиск клиента
        let client = await findClientByPhone(input.phone);
        if (!client) {
            console.log('Клиент не найден, создаю нового...');
            client = await createClient(input.name, input.phone);
        }
        const service = await findServiceByName(input.service_name);
        if (!service) {
            throw new Error('Услуга не найдена');
        }

        const master = await findStaffByName(input.master_name);
        if (!master) {
            throw new Error('Сотрудник не найден');
        }
        const masterServices = await getStaffServices();
        const serviceProvided = masterServices.find(s => s.id === service.id);
        if (!serviceProvided) {
            throw new Error('Мастер не оказывает данную услугу');
        }

        const isBusy = await checkAvailability(master.id, service.id, datetime);
        if (isBusy) {
            throw new Error('Мастер занят на это время');
        }


        const record = await createRecord(client, master, service, datetime);
        console.log('Запись успешно создана:', record);

    } catch (error) {
        console.error('Ошибка:', error.message);
    }
}

async function findClientByPhone(phone) {
    const res = await axios.post(`${API_BASE_URL}/company/${COMPANY_ID}/clients/search`, {
        filters: [{
            type: 'quick_search',
            state: { value: phone }
        }]
    }, { headers: AUTH_HEADERS });

    return res.data.data && res.data.data.length ? res.data.data[0] : null;
}

async function createClient(name, phone) {
    const res = await axios.post(`${API_BASE_URL}/company/${COMPANY_ID}/clients`, {
        name,
        phone
    }, { headers: AUTH_HEADERS });

    return res.data.data;
}

async function findServiceByName(name) {
    const res = await axios.get(`${API_BASE_URL}/company/${COMPANY_ID}/services`, {
        headers: AUTH_HEADERS
    });

    return res.data.data.find(service => service.title === name);
}

async function findStaffByName(name) {
    const res = await axios.get(`${API_BASE_URL}/company/${COMPANY_ID}/staff`, {
        headers: AUTH_HEADERS
    });

    return res.data.data.find(staff => staff.name === name);
}

// Получение списка услуг мастера
async function getStaffServices() {
    const res = await axios.get(`${API_BASE_URL}/company/${COMPANY_ID}/services`, {
        headers: AUTH_HEADERS
    });

    return res.data.data;
}

// Проверка доступности времени у мастера
// Проверка доступности времени у мастера через book_dates
async function checkAvailability(staffId, serviceId, datetime) {
    console.log("datetime: ", datetime);

    const date = datetime.split('T')[0]; // yyyy-mm-dd
    const [year, month, day] = date.split('-');

    const res = await axios.get(`${API_BASE_URL}/book_dates/${COMPANY_ID}`, {
        headers: AUTH_HEADERS,
        params: {
            staff_id: staffId,
            service_ids: [serviceId],
            date_from: date,
            date_to: date,
        }
    });

    let bookingDays = {};
    if (res.data && res.data.data && res.data.data) {
        bookingDays = res.data.data.booking_days;
    }

    console.log("bookingDays:", bookingDays);

    const monthKey = String(Number(month)); // без нуля спереди, например "4"
    const availableDays = bookingDays[monthKey] || []; // массив дней в этом месяце

    const isAvailable = availableDays.includes(Number(day)); // привожу к числу

    return isAvailable;
}




// Создание записи клиента
async function createRecord(client, master, service, datetime) {
    const res = await axios.post(`${API_BASE_URL}/records/${COMPANY_ID}`, {
        staff_id: master.id,
        services: [{ id: service.id }],
        client: {
            id: client.id
        },
        datetime,
        seance_length: 3600, // 1 час
        send_sms: true
    }, { headers: AUTH_HEADERS });

    return res.data.data;
}

// Запуск
recordClient(inputData);