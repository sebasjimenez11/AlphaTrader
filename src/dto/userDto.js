export default class UserDto {
    #ID;
    #fullName;
    #email;
    #dateOfBirth;
    #status;
    #password;
    #facebookId;
    #googleId;
    #telefono;
    #acceptedTerms;

    /**
     * 
     * @param {Object} userData - Datos del usuario
     */
    constructor({ ID, FullName, Email, dateOfBirth, status, Password, facebookId, googleId, telefono, acceptedTerms }) {
        this.ID = ID;
        this.fullName = FullName ?? 'no name';
        this.email = Email;
        this.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : new Date('1900-01-01');;
        this.status = status ?? false;
        this.acceptedTerms = acceptedTerms ?? false;
        this.password = Password ?? null;
        this.facebookId = facebookId ?? null;
        this.googleId = googleId ?? null;
        this.telefono = telefono ?? '';
    }

    // Getters y Setters

    get ID() {
        return this.#ID;
    }

    set ID(value) {
        this.#ID = value;
    }

    get fullName() {
        return this.#fullName;
    }

    set fullName(value) {
        this.#fullName = value;
    }

    get email() {
        return this.#email;
    }

    set email(value) {
        this.#email = value;
    }

    get dateOfBirth() {
        return this.#dateOfBirth;
    }

    set dateOfBirth(value) {
        this.#dateOfBirth = value;
    }

    get status() {
        return this.#status;
    }

    set status(value) {
        this.#status = value;
    }

    get password() {
        return this.#password;
    }

    set password(value) {
        this.#password = value;
    }

    get facebookId() {
        return this.#facebookId;
    }

    set facebookId(value) {
        this.#facebookId = value;
    }

    get googleId() {
        return this.#googleId;
    }

    set googleId(value) {
        this.#googleId = value;
    }

    get telefono() {
        return this.#telefono;
    }

    set telefono(value) {
        this.#telefono = value;
    }

    get acceptedTerms() {
        return this.#acceptedTerms;
    }

    set acceptedTerms(value) {
        this.#acceptedTerms = value;
    }

    /**
     * Método para convertir el DTO a JSON
     */
    toJSON() {
        return {
            ID: this.ID,
            FullName: this.fullName,
            Email: this.email,
            Password: this.password ?? '',
            DateOfBirth: this.dateOfBirth,
            Status: this.status ?? false,
            facebookId: this.facebookId ?? null, // en minúsculas
            googleId: this.googleId ?? null,     // en minúsculas
            Telefono: this.telefono ?? '',
            acceptedTerms: this.acceptedTerms ?? false
        };
    }

}
