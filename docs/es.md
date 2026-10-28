# Holidays Calendar (festivos y vacaciones escolares)

Los festivos y las vacaciones escolares aparecen directamente en el **calendario de Gladys**, junto a sus
otros calendarios. Sus escenas los usan después con los bloques de calendario de Gladys: el despertador,
la calefacción y las persianas ya no se comportan igual un festivo o durante las vacaciones.

- **Festivos de unos 200 países** y de sus subdivisiones (Alsacia-Mosela, estados alemanes, cantones
  suizos, provincias canadienses, estados de EE. UU.…), calculados **sin conexión** en su Gladys: sin
  cuenta, sin red.
- **Vacaciones escolares francesas** de su zona (opcional), de los datos abiertos del Ministerio de
  Educación, en un segundo calendario.
- Sus **puentes y días de cierre** añadidos al calendario de festivos, y los festivos que no quiere ver,
  excluidos.

> Probada con su batería de pruebas automáticas, aún no en muchas instalaciones reales de Gladys: sus
> comentarios son bienvenidos en el foro de Gladys o en las issues de GitHub.

## Lo que necesita

- Gladys Assistant **5.2.0** o posterior (las integraciones de calendario llegan con esa versión).
- Nada más: ni cuenta, ni clave de API, ni hardware. Solo las vacaciones escolares francesas necesitan
  acceso a Internet, una vez al día.

## Configuración

Instale la integración (**Integraciones → Instalar desde GitHub**, dirección
`https://github.com/prohand/gladys-calendar-holidays`), abra su pestaña **Configuración**, rellene los
campos siguientes y guarde. Estos ajustes valen para todo el hogar.

### País y subdivisión

- **País**: los festivos que se siguen. Los países francófonos aparecen primero, luego los demás por orden
  alfabético (en inglés).
- **Subdivisión**: opcional, para una región con festivos propios. Ejemplos: `MD` para Madrid, `CT` para
  Cataluña, `67` para Alsacia, `QC` para Quebec. Algunas subdivisiones tienen regiones: `BY-KATH` para los
  municipios católicos de Baviera (15 de agosto). El botón **Comprobar la configuración** indica los
  códigos del país.
- **Días incluidos en el calendario**: solo los festivos oficiales por defecto. Puede añadir los festivos
  bancarios, los días sin clase locales, los días opcionales y las conmemoraciones (Día de la Madre,
  domingo de Pentecostés…).

### Días libres adicionales y festivos excluidos

- **Días libres adicionales**: puentes o días de cierre, añadidos al calendario de festivos, separados
  por comas: `2026-05-15` para una fecha, `12-24` para cada año, con un nombre opcional tras `=`:
  `2026-05-15=Puente, 12-24=Nochebuena`. Sin nombre, el evento se llama «Día libre».
- **Festivos excluidos**: festivos que no se ponen en el calendario, separados por comas. Un nombre en
  cualquier idioma (`Lunes de Pentecostés`), una fecha (`2027-05-17`) o un día de cada año (`12-26`).

### Vacaciones escolares francesas

Para Francia y sus territorios de ultramar. Elija su **zona**: A, B, C, Córcega, Guadeloupe, Guayana
Francesa, Martinica, Mayotte, Reunión o San Pedro y Miquelón. Las vacaciones de los alumnos se leen una
vez al día de data.education.gouv.fr y se guardan: un corte de Internet no cambia nada en los días ya
conocidos. Deje **Ninguna** para que la integración funcione totalmente sin conexión.

## Activar los calendarios («Mis calendarios»)

En Gladys, un calendario pertenece a un usuario. Cada persona que quiera los calendarios abre la página
de la integración y pulsa **Activar para mí** en el bloque **Mis calendarios**. Recibe entonces:

- **Festivos (Francia)** (en rojo): un evento de día completo por festivo, de enero de este año a
  diciembre del año que viene;
- **Vacaciones escolares (Zone C)** (en verde), si se elige una zona: un evento por periodo, del primer
  día de vacaciones a la víspera de la vuelta a clase.

Los nombres de los calendarios y de los festivos siguen el idioma de cada usuario (inglés, francés,
alemán o español). Bajo cada calendario, dos interruptores:

- **Sincronizar este calendario**: apagado, el calendario se vacía y la integración deja de llenarlo;
- **Compartir con el hogar**: ver más abajo.

**Desactivar y eliminar mis calendarios** quita los calendarios de esa persona; activarla de nuevo los
vuelve a crear.

## Usar los calendarios en las escenas

Gladys solo muestra a las escenas los calendarios **compartidos**: active **Compartir con el hogar** en el
calendario que necesite (basta con una persona del hogar). Después, en el editor de escenas:

- disparador **Se acerca un evento del calendario**: por ejemplo al inicio de cualquier evento del
  calendario «Festivos», o la víspera a las 20 h;
- acción **Condición sobre eventos del calendario**: «continuar solo si hay un evento en curso en
  Vacaciones escolares», para que el despertador de los niños no suene en vacaciones;
- acción **Obtener eventos del calendario**: para anunciar el próximo festivo en un mensaje.

Ejemplo: una escena «Despertar» a las 7 h entre semana, con la condición «ningún evento en curso en
Festivos», no suena el día de Navidad.

## Qué se envía, y cuándo

- Al arrancar, cuando Gladys vuelve tras un reinicio y cada vez que se guarda la configuración, se envía
  todo de nuevo.
- Cuando alguien activa la integración o vuelve a encender un calendario, sus calendarios se envían de
  nuevo.
- Cada 15 minutos, la integración mira qué ha cambiado (calendario escolar leído de nuevo, año nuevo) y
  solo envía eso. El 1 de enero se añade el año siguiente; los años pasados quedan en el calendario como
  historial.
- Un evento que usted cree a mano en estos calendarios nunca lo borra la integración.

## Solución de problemas

- **No veo los calendarios**: active la integración para usted en **Mis calendarios** y recargue la vista
  Calendario.
- **La escena no reacciona**: el calendario debe estar **compartido con el hogar**.
- **Falta un festivo de mi región**: rellene la **Subdivisión**. **Comprobar la configuración** indica
  los códigos y señala un código desconocido.
- **No hay vacaciones escolares**: compruebe la zona y el acceso a Internet de Gladys.
  **Comprobar la configuración** indica hasta qué fecha se conocen las vacaciones y qué hay que corregir.
- El estado de la integración pasa a error cuando Gladys rechaza un envío; la integración lo vuelve a
  intentar sola un cuarto de hora después.

## Límites

- Un país por instalación, el mismo para todo el hogar.
- Los festivos decididos tarde por un gobierno llegan con una actualización de date-holidays; el campo
  **Días libres adicionales** cubre la espera. Las fiestas lunares pueden diferir un día del anuncio
  oficial.
- Vacaciones escolares: solo alumnos; Nueva Caledonia, Polinesia Francesa y Wallis y Futuna no se
  ofrecen. Más allá de lo que el ministerio ha publicado, no se inventa nada.
- Cada usuario tiene su propia copia de los calendarios: si dos personas los comparten, las escenas ven
  cada festivo dos veces.

## Créditos

- [date-holidays](https://github.com/commenthol/date-holidays) (código ISC, datos CC BY 3.0): los
  festivos de todos los países.
- [Calendrier scolaire](https://data.education.gouv.fr/explore/dataset/fr-en-calendrier-scolaire/) del
  Ministerio de Educación francés (Licence Ouverte 2.0).
- [gladys-holidays](https://github.com/guim31/gladys-holidays) (Apache-2.0): el cálculo de los festivos y
  la lectura del calendario escolar vienen de esa integración.
