# Plan de contratos de los médicos

Versión 1.0  
Fecha: 29 de octubre de 2026  
Programa: Diplomado de Posgrado en Electrodiagnóstico y Electromiografía Clínica (ElectroDx)

Este paquete no es una opinión jurídica. La razón social todavía no está escrita en los documentos: el borrador anterior inventa “ElectroDx, S.A.P.I. de C.V.” y esa sociedad no consta en la plataforma. Hasta que exista el acta constitutiva, los contratos usan [RAZÓN SOCIAL].

## Qué firma cada médico

Los tres papeles pueden coincidir en la misma persona. El anexo dice cuáles se abren. Firmar un papel no paga nada por sí solo: paga la participación validada.

| Papel | Qué hace | De qué ingreso participa |
| --- | --- | --- |
| Profesor | Imparte clases o talleres. No escribe el libro. | Solo docencia de la generación en la que impartió. |
| Editor | Agrega o modifica texto de temas, reactivos, casos o configuración de la aplicación. No imparte. | Texto, si entró a la edición. Reactivos, casos y configuración, en la bolsa editorial. |
| Profesor y editor | Hace las dos cosas. | Cada bolsa por separado, solo en la medida de lo que hizo. |

Documentos:

| Orden | Archivo | Función |
| --- | --- | --- |
| 1 | [Contrato](./contrato-prestacion-servicios-medicos.md) | Relación civil, independencia, fórmula, licencia de la obra, confidencialidad y salida. |
| 2 | [Anexo de participación](./anexo-participacion.md) | Papel de esa persona, tasas de esa generación y cuenta para el pago. Se firma junto con el contrato. |
| 3 | [Reglamento editorial y del libro](./reglamento-editorial-y-libro.md) | Qué cuenta como texto, qué es un reactivo y cómo se congelan los créditos de la edición. |
| — | [Aviso de privacidad del médico](./aviso-de-privacidad-medicos.md) | Datos del colaborador. Se acepta dentro del contrato. No sustituye al aviso del alumno. |

El [borrador anterior](./borrador-01.md) se conserva como antecedente. No se firma.

## Crítica del borrador

El borrador acierta en una cosa: la relación debe ser civil, con CFDI del médico, sin salario ni subordinación. El resto no describe este diplomado.

1. **Un solo papel, “el profesor”.** Aquí hay quien solo imparte, quien solo edita y quien hace ambas. Un porcentaje único sobre “el módulo que imparta” deja al editor sin regla y le paga al profesor por un libro que no escribió.

2. **El reparto usa horas de clase.** El texto que se exporta a libro no se mide en horas. Dos médicos pueden impartir lo mismo y haber escrito cantidades distintas. La hora no distingue una corrección clínica de un tema nuevo.

3. **Hay dos fórmulas y se contradicen.** En una parte el médico recibe 30% si la plataforma hace el marketing, o 70% si él trae a los alumnos. Después la misma venta se parte en 70/30, y en el canal referido en 55/25/20. Esas cifras no salen de un precio ni de un acuerdo de esta generación. Además, el canal referido más la bolsa docente puede pagarse encima del reparto del libro, y el borrador no dice de qué bolsa sale.

4. **La base “ingreso neto menos impuestos” está mal armada.** Restar “los impuestos” antes del porcentaje mezcla el IVA, el ISR de la empresa y la retención que se hace al médico al pagarle. La retención se aplica sobre los honorarios del médico, no se descuenta otra vez de la colegiatura de todos. La base de este paquete es lo cobrado al alumno menos la comisión del medio de cobro. El impuesto del CFDI se calcula al pagar.

5. **La licencia muere con el contrato.** El borrador permite retirar el material cuando termina la generación. Eso choca con el libro y con el alumno que ya pagó. El texto aceptado en una edición se queda en esa edición y en las generaciones que ya lo usan. A cambio, el médico sigue cobrando su parte de las ventas del libro mientras esa edición se venda y su texto siga dentro.

6. **La plataforma solo anota al último editor.** En el código, el crédito de un tema publicado puede quedar en `last_edited_by`. El acuerdo pedido es otro: quien agregó o modificó información del tema participa. El acta de créditos de la edición tiene que listar cada contribución aceptada, no solo la última.

7. **Configurar la aplicación no es autoría del libro.** Ordenar menús, fechas o permisos no genera palabras del libro ni derechos sobre el código. Si se paga, se paga en la bolsa editorial, con unidades chicas.

8. **El aviso de privacidad del alumno no es el contrato de la empresa.** Está en [../alumnos/aviso-de-privacidad.md](../alumnos/aviso-de-privacidad.md). Habla de la cuenta, el kárdex y la firma del alumno. No tiene RFC, CLABE, autoría ni liquidaciones. Sí le faltaba decir que el docente ve calificaciones: esa frase ya se agregó. Los datos del médico van en su propio aviso.

9. **La sociedad recomendada no se copia al contrato.** Elegir S.A.P.I., S.A.S. o S. de R.L. es una decisión de constitución, con costos, socios y límites distintos. No se afirma aquí cuál conviene. El contrato del médico empieza cuando ya existe una razón social.

## Cómo se calcula la participación

Hay dos ingresos distintos. No se suman en una sola bolsa.

**Ingreso del diplomado.** Lo que los alumnos de una generación pagaron y se cobró, menos la comisión del medio de cobro. No se resta el ISR de la empresa ni la retención del médico.

**Ingreso del libro.** Lo que se cobró por esa edición, impresa o digital, menos el costo directo de impresión, distribución y la comisión de la tienda. Tampoco se resta el ISR.

Sobre el ingreso del diplomado hay tres tasas máximas. Son iguales para todos los médicos de esa generación. Lo que cambia es la participación de cada uno. La parte de la tasa que nadie devengó se queda en la plataforma. No se reparte entre los demás.

| Bolsa | Quién puede entrar | Cómo se mide | Propuesta de tasa máxima |
| --- | --- | --- | --- |
| Docencia | Profesor, o profesor y editor | Sesiones que impartió y la Dirección validó, entre todas las sesiones computables de la generación | 15% del ingreso del diplomado |
| Obra | Editor, o profesor y editor | Palabras de texto suyas en la edición, entre todas las palabras de la edición | 15% del ingreso del diplomado |
| Editorial | Editor, o profesor y editor | Unidades de reactivos, casos y configuración, entre todas las unidades de la generación | 5% del ingreso del diplomado |

La plataforma conserva el resto. Si las tres tasas se devengan completas, los médicos llegan a 35% y la plataforma conserva 65%. Si escribieron o impartieron poco, la plataforma conserva más.

Sobre el ingreso del libro no hay bolsa de docencia ni de configuración. De cada edición:

- 40% queda en la plataforma por publicar, editar y distribuir la obra colectiva.
- 60% se reparte según las palabras. Cada médico recibe ese 60% multiplicado por sus palabras entre las palabras de la edición. Las palabras de la plataforma se quedan en la plataforma.

Un profesor que no tiene palabras en el acta cobra cero por el libro. Un editor que no impartió cobra cero por docencia. Quien hizo ambas cobra cada resultado, sin que uno sustituya al otro.

El anexo puede cerrar una bolsa aunque la persona después quiera entrar. Si va a escribir, el anexo se modifica antes de aceptar el texto. No se publica un texto y se le niega la bolsa de obra.

### Ejemplo, no es una cotización

Generación que cobró 1,000,000 después de la comisión. Edición de 100,000 palabras. La doctora A escribió 20,000 y no impartió. El doctor B escribió 5,000, impartió 10 de 40 sesiones y elaboró 10 de 100 reactivos. Otro profesor impartió 4 sesiones y no escribió. Tasas de la propuesta: docencia 15%, obra 15%, editorial 5%. El libro de esa edición cobró 200,000 netos.

| Persona | Diplomado | Libro |
| --- | --- | --- |
| A, solo texto | 1,000,000 × 0.15 × 0.20 = 30,000 | 200,000 × 0.60 × 0.20 = 24,000 |
| B, texto, clase y reactivos | 7,500 de obra + 37,500 de docencia + 5,000 de editorial = 50,000 | 200,000 × 0.60 × 0.05 = 6,000 |
| Profesor de 4 sesiones | 1,000,000 × 0.15 × 4/40 = 15,000 | 0 |

Las 30 sesiones que no impartió un médico contratado no se reparten: 1,000,000 × 0.15 × 30/40 se queda en la plataforma.

## Reglas que evitan el conflicto

- Las tasas viven en el anexo de la generación y son las mismas para todos. Un trato distinto a una persona sale de la parte de la plataforma, por escrito, y no reduce las palabras de los demás.
- El acta de créditos se congela al exportar el libro. Hay diez días hábiles para objetar. Después esa edición ya no se recalcula.
- Una corrección posterior entra a la siguiente edición.
- Dos médicos no cobran dos veces las mismas palabras. Si reescribieron el mismo pasaje, el comité parte esas palabras.
- Ortografía, formato y ordenar la aplicación no son palabras de obra.
- El médico conserva el derecho moral. La plataforma recibe licencia exclusiva sobre el texto aceptado para el diplomado, la aplicación y el libro, incluyendo ediciones que sigan conteniendo ese texto.
- El código, la marca, la base de alumnos y la compilación son de la plataforma.
- El médico factura. El pago sale en los quince días hábiles siguientes a la liquidación cerrada y al CFDI.
- No hay mínimo garantizado, salvo que el anexo escriba un monto fijo por sesión para un profesor que no entra a la bolsa variable.

## Qué queda fuera a propósito

- Comisión por traer alumnos con un cupón. Si más adelante se quiere, va en un anexo comercial distinto. Meterla aquí mezcla “quién vendió” con “quién escribió”.
- Porcentaje fijo 70/30.
- Retiro del texto al terminar la generación, para lo ya incluido en una edición o ya usado por alumnos inscritos.
- Exclusividad de la práctica médica. El médico puede atender y dar clase en otro sitio. No puede publicar por su cuenta el mismo texto mientras dure la licencia.
