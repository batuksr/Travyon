import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/preferences/unit_formatter.dart';
import '../../../core/theme/app_theme.dart';
import '../data/plan_detail.dart';
import '../data/travel_plans_repository.dart';

String budgetMoney(BuildContext context, String symbol, double amount) =>
    '$symbol${UnitFormatter.of(context).number(amount, fractionDigits: 2)}';

class PlanBudgetOverview extends StatelessWidget {
  const PlanBudgetOverview({super.key, required this.plan});

  final TravelPlanSummary plan;

  @override
  Widget build(BuildContext context) {
    final stops = plan.days.expand((day) => day.stops).toList();
    final spent = stops.fold<double>(
      0,
      (sum, stop) => sum + (stop.actual ?? 0),
    );
    final entered = stops.where((stop) => stop.actual != null).length;
    final hasBudget = plan.allocatedBudget > 0;
    final remaining = plan.allocatedBudget - spent;
    final overBudget = hasBudget && remaining < 0;
    final status = !hasBudget
        ? context.tr('Bütçe belirlenmedi')
        : context.tr(
            overBudget ? '{amount} bütçe aşıldı' : '{amount} kaldı',
            values: {
              'amount': budgetMoney(
                context,
                plan.currencySymbol,
                remaining.abs(),
              ),
            },
          );
    final used = hasBudget
        ? UnitFormatter.of(context)
              .number(spent / plan.allocatedBudget * 100, fractionDigits: 0)
        : '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.forest,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.account_balance_wallet_outlined,
                    color: Color(0xFFF0D6A5),
                    size: 22,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      context.tr('Harcama özeti'),
                      style: const TextStyle(
                        color: Color(0xFFDCE7DF),
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: context.tr('Bütçe nasıl hesaplanır?'),
                    color: const Color(0xFFDCE7DF),
                    icon: const Icon(Icons.info_outline_rounded, size: 20),
                    onPressed: () => showAppInformation(
                      context,
                      title: 'Bütçe nasıl hesaplanır?',
                      message: 'Gerçek harcama, duraklara girdiğin tutarların toplamıdır. Cüzdan belgeleri ayrıca ücret olarak eklenmez.',
                      icon: Icons.account_balance_wallet_outlined,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                context.tr('Gerçek harcama'),
                style: const TextStyle(color: Color(0xFFDCE7DF), fontSize: 13),
              ),
              const SizedBox(height: 4),
              Text(
                budgetMoney(context, plan.currencySymbol, spent),
                style: const TextStyle(
                  color: AppColors.surface,
                  fontSize: 38,
                  height: 1.2,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -1,
                ),
              ),
              const SizedBox(height: 22),
              if (hasBudget) ...[
                LinearProgressIndicator(
                  value: (spent / plan.allocatedBudget).clamp(0, 1),
                  color: overBudget
                      ? const Color(0xFFFFB5A5)
                      : const Color(0xFFF0D6A5),
                  backgroundColor: Colors.white.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(8),
                  minHeight: 7,
                  semanticsLabel: '${context.tr('Bütçe kullanımı')}. $status',
                ),
                const SizedBox(height: 14),
              ],
              Wrap(
                spacing: 12,
                runSpacing: 8,
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    status,
                    style: TextStyle(
                      color: overBudget
                          ? const Color(0xFFFFC9BB)
                          : const Color(0xFFF0D6A5),
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (hasBudget)
                    Text(
                      context.tr(
                        'Bütçenin %{percent} kadarı kullanıldı',
                        values: {'percent': used},
                      ),
                      style: const TextStyle(
                        color: Color(0xFFDCE7DF),
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final metrics = [
              _BudgetMetric(
                icon: Icons.savings_outlined,
                label: context.tr('Ayrılan bütçe'),
                amount: hasBudget
                    ? budgetMoney(
                        context,
                        plan.currencySymbol,
                        plan.allocatedBudget,
                      )
                    : context.tr('Belirlenmedi'),
              ),
              _BudgetMetric(
                icon: Icons.receipt_long_outlined,
                label: context.tr('Tahmini plan maliyeti'),
                amount: budgetMoney(
                  context,
                  plan.currencySymbol,
                  plan.estimatedCost,
                ),
              ),
            ];
            if (constraints.maxWidth < 300 ||
                MediaQuery.textScalerOf(context).scale(13) > 18) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [metrics[0], const SizedBox(height: 10), metrics[1]],
              );
            }
            return IntrinsicHeight(
              child: Row(
                children: [
                  Expanded(child: metrics[0]),
                  const SizedBox(width: 12),
                  Expanded(child: metrics[1]),
                ],
              ),
            );
          },
        ),
        const SizedBox(height: 14),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: EdgeInsets.only(top: 2),
              child: Icon(
                Icons.receipt_outlined,
                size: 17,
                color: context.colors.muted,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                context.tr(
                  '$entered / ${stops.length} durağa harcama girildi.',
                ),
                style: TextStyle(
                  color: context.colors.muted,
                  fontSize: 12,
                  height: 1.5,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _BudgetMetric extends StatelessWidget {
  const _BudgetMetric({
    required this.icon,
    required this.label,
    required this.amount,
  });
  final IconData icon;
  final String label, amount;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: context.colors.surface,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: context.colors.divider),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: context.colors.forest),
        const SizedBox(height: 12),
        Text(
          label,
          style: TextStyle(
            color: context.colors.muted,
            fontSize: 12,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          amount,
          style: TextStyle(
            color: context.colors.text,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    ),
  );
}

class PlanBudgetDayCard extends StatelessWidget {
  const PlanBudgetDayCard({
    super.key,
    required this.day,
    required this.label,
    required this.symbol,
    required this.busy,
    required this.onExpense,
    this.initiallyExpanded = false,
  });

  final PlanDay day;
  final String label, symbol;
  final bool busy, initiallyExpanded;
  final ValueChanged<PlanStop> onExpense;

  @override
  Widget build(BuildContext context) {
    final spent = day.stops.fold<double>(
      0,
      (sum, stop) => sum + (stop.actual ?? 0),
    );
    return Material(
      color: context.colors.surface,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: context.colors.divider),
      ),
      child: ExpansionTile(
        initiallyExpanded: initiallyExpanded,
        shape: const Border(),
        collapsedShape: const Border(),
        iconColor: context.colors.forest,
        collapsedIconColor: context.colors.muted,
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        title: Text(
          label,
          style: const TextStyle(
            fontFamily: AppTypography.body,
            fontSize: 15,
            height: 1.4,
            fontWeight: FontWeight.w700,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(
            context.tr(
              '{amount} harcandı',
              values: {'amount': budgetMoney(context, symbol, spent)},
            ),
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: context.colors.forest,
            ),
          ),
        ),
        children: [
          Divider(height: 1, color: context.colors.divider),
          if (day.stops.isEmpty)
            Padding(
              padding: const EdgeInsets.all(18),
              child: Text(
                context.tr('Bu gün için durak eklenmemiş.'),
                style: TextStyle(color: context.colors.muted, fontSize: 13),
              ),
            ),
          for (final stop in day.stops) ...[
            if (stop.index > 0)
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Divider(height: 1, color: context.colors.divider),
              ),
            InkWell(
              onTap: busy ? null : () => onExpense(stop),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            stop.name,
                            style: TextStyle(
                              color: context.colors.text,
                              fontSize: 14,
                              height: 1.4,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 10,
                            runSpacing: 6,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: stop.actual == null
                                      ? context.colors.tone(
                                          const Color(0xFFF5F0E7),
                                        )
                                      : context.colors.tone(
                                          const Color(0xFFEAF0E9),
                                        ),
                                  borderRadius: BorderRadius.circular(7),
                                ),
                                child: Text(
                                  stop.actual == null
                                      ? context.tr('Harcama girilmedi')
                                      : budgetMoney(
                                          context,
                                          symbol,
                                          stop.actual!,
                                        ),
                                  style: TextStyle(
                                    color: stop.actual == null
                                        ? context.colors.muted
                                        : context.colors.forest,
                                    fontSize: 12,
                                    fontWeight: stop.actual == null
                                        ? FontWeight.w400
                                        : FontWeight.w700,
                                  ),
                                ),
                              ),
                              Text(
                                context.tr(
                                  'Tahmini ${budgetMoney(context, symbol, stop.estimated)}',
                                ),
                                style: TextStyle(
                                  color: context.colors.muted,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    IconButton(
                      key: ValueKey('expense-${day.index}-${stop.index}'),
                      tooltip: context.tr(
                        stop.actual == null
                            ? 'Harcama ekle'
                            : 'Harcama düzenle',
                      ),
                      onPressed: busy ? null : () => onExpense(stop),
                      style: IconButton.styleFrom(
                        minimumSize: const Size(48, 48),
                        backgroundColor: stop.actual == null
                            ? context.colors.tone(const Color(0xFFFBE8D8))
                            : context.colors.tone(const Color(0xFFEAF0E9)),
                        foregroundColor: stop.actual == null
                            ? context.colors.tone(const Color(0xFFA74F21))
                            : context.colors.forest,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      icon: Icon(
                        stop.actual == null
                            ? Icons.add_rounded
                            : Icons.edit_outlined,
                        size: 20,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
