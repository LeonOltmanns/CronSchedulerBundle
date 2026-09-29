/**
 * Scheduled Jobs plugin - JavaScript.
 *
 * Rules for this file:
 * 1. Define every function at file level. Do NOT define them inside
 *    Mautic.cronschedulerOnLoad. Mautic runs that hook only after it loads page
 *    content, so a function inside it does not exist before that time.
 * 2. Bind document-level events once, with the ".cronScheduler" namespace.
 *    Mautic runs the OnLoad hook again after each page change. Handlers
 *    bound inside the hook would stack up.
 */

/**
 * Show only the fields that belong to the selected trigger mode.
 */
Mautic.cronSchedulerToggleTimeframes = function () {
    var mode = mQuery('input[name="cronscheduler[triggerMode]"]:checked').val();

    mQuery('#triggerInterval, #triggerDate, #cron-notation').addClass('hide');

    if (mode === 'interval') {
        mQuery('#triggerInterval').removeClass('hide');
    }

    if (mode === 'date') {
        mQuery('#triggerDate').removeClass('hide');
    }

    if (mode === 'cron') {
        mQuery('#cron-notation').removeClass('hide');
    }
};

/**
 * Show the day-of-week settings only for interval units of one day or more.
 */
Mautic.cronSchedulerShowHideIntervalSettings = function () {
    var unit = mQuery('#cronscheduler_triggerIntervalUnit').val();

    if (unit === 'i' || unit === 'h') {
        mQuery('#interval_settings,#interval_settings_days').addClass('hide');
    } else {
        mQuery('#interval_settings,#interval_settings_days').removeClass('hide');
    }
};

/**
 * The "week days" checkbox selects Monday to Friday.
 */
Mautic.cronSchedulerSelectDOW = function () {
    if (mQuery('#cronscheduler_triggerRestrictedDaysOfWeek_7').prop('checked')) {
        mQuery(
            '#cronscheduler_triggerRestrictedDaysOfWeek_0,' +
            '#cronscheduler_triggerRestrictedDaysOfWeek_1,' +
            '#cronscheduler_triggerRestrictedDaysOfWeek_2,' +
            '#cronscheduler_triggerRestrictedDaysOfWeek_3,' +
            '#cronscheduler_triggerRestrictedDaysOfWeek_4'
        ).prop('checked', true);
    }

    mQuery('#cronscheduler_triggerRestrictedDaysOfWeek_7').prop('checked', false);
};

/**
 * Set the start state of the job form. Safe to call many times.
 * Does nothing on pages that have no job form.
 */
Mautic.cronSchedulerInit = function () {
    if (!mQuery('input[name="cronscheduler[triggerMode]"]').length) {
        return;
    }

    Mautic.cronSchedulerToggleTimeframes();

    if (mQuery('#cronscheduler_triggerIntervalUnit').length) {
        Mautic.cronSchedulerShowHideIntervalSettings();
    }
};

/**
 * Mautic hook. Runs when content with mauticContent "cronscheduler" loads.
 */
Mautic.cronschedulerOnLoad = function (container, response) {
    Mautic.cronSchedulerInit();
};

// Delegated events: they work for form elements that Mautic adds later with AJAX.
mQuery(document)
    .off('.cronScheduler')
    .on('change.cronScheduler', 'input[name="cronscheduler[triggerMode]"]', function () {
        Mautic.cronSchedulerToggleTimeframes();
    })
    .on('change.cronScheduler', '#cronscheduler_triggerIntervalUnit', function () {
        Mautic.cronSchedulerShowHideIntervalSettings();
    })
    .on('change.cronScheduler', '[id^="cronscheduler_triggerRestrictedDaysOfWeek_"]', function () {
        Mautic.cronSchedulerSelectDOW();
    });

Mautic.showRecentJobLogs = function (e) {

    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    const DROPDOWN_ID = 'cronLogsDropdown';
    const failedTranslation = (typeof mauticLang !== 'undefined' && mauticLang['mautic.cron.logs.failed'])
        ? mauticLang['mautic.cron.logs.failed']
        : 'Failed to load logs';
    let $dropdown = mQuery('#' + DROPDOWN_ID);

    // Create dropdown container (panel with fixed scroll area) on first use.
    if (!$dropdown.length) {
        const title = (typeof mauticLang !== 'undefined' && mauticLang['mautic.cron.logs.title'])
            ? mauticLang['mautic.cron.logs.title']
            : 'Job execution logs';

        $dropdown = mQuery(
            '<ul id="' + DROPDOWN_ID + '"' +
            ' class="dropdown-menu dropdown-menu-right dropdown-menu-lg"' +
            ' style="width:360px; position:fixed; top:60px; right:15px; z-index:1050;">' +
            '<li>' +
            '<div class="panel panel-default mb-0">' +
            '<div class="panel-heading" style="display:flex; justify-content:space-between; align-items:center;">' +
            '<h6 class="panel-title fw-sb mb-0" style="flex:1;">' + title + '</h6>' +
            '<a href="javascript:void(0);" class="btn btn-nospin text-danger"' +
            ' onclick="mQuery(\'#' + DROPDOWN_ID + '\').hide();" title="Close">' +
            '<i class="ri-close-circle-line"></i>' +
            '</a>' +
            '</div>' +
            '<div class="pt-0 pb-xs pl-0 pr-0">' +
            '<div class="scroll-content slimscroll" id="cronLogsContainer" style="height:250px;">' +
            '<div class="spinner text-center"><i class="ri-loader-3-line ri-spin"></i></div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</li>' +
            '</ul>'
        );

        // Append to body so dropdown is visible and not clipped by navbar overflow
        mQuery(document.body).append($dropdown);
    }

    // Always refresh logs when opening the dropdown so new executions appear immediately.
    $dropdown.toggle();

    mQuery.ajax({
        url: mauticAjaxUrl + (mauticAjaxUrl.indexOf('?') === -1 ? '?' : '&') + 'action=plugin:cronScheduler:logs',
        type: 'POST',
        data: {
            action: 'plugin:cronScheduler:logs'
        },
        beforeSend: function (request) {
            if (typeof mauticAjaxCsrf !== 'undefined') {
                request.setRequestHeader('X-CSRF-Token', mauticAjaxCsrf);
            }
        },
        dataType: 'json',
        success: function (response) {
            const html = (response && response.html)
                ? response.html
                : '<div class="text-center p-10 text-muted">No logs available</div>';

            const $container = $dropdown.find('#cronLogsContainer');
            $container.html(html);
            $container.off('click.cronLogs').on('click.cronLogs', 'a', function () {
                $dropdown.hide();
            });

            if (typeof Mautic.makeLinksAlive === 'function') {
                Mautic.makeLinksAlive($container.find('a[data-toggle="ajax"]'));
            }
            if (typeof Mautic.makeModalsAlive === 'function') {
                Mautic.makeModalsAlive($container.find('*[data-toggle="ajaxmodal"]'));
            }
        },
        error: function (xhr, status, error) {
            $dropdown.find('#cronLogsContainer').html(
                '<div class="text-danger p-10 text-center">' + failedTranslation + '</div>'
            );
        }
    });

    $dropdown.off('click').on('click', function (e) {
        e.stopPropagation();
    });
};

mQuery(document).on('click', function (e) {
    if (!mQuery(e.target).closest('#cronLogsDropdown, #recentJobLogsBtn').length) {
        mQuery('#cronLogsDropdown').hide();
    }
});

mQuery(document).on('show.bs.dropdown', function (e) {
    if (!mQuery(e.target).closest('#recentJobLogsBtn').length) {
        mQuery('#cronLogsDropdown').hide();
    }
});
