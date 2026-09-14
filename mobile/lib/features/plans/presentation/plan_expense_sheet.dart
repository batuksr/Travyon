import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/preferences/unit_formatter.dart';
import '../../../core/theme/app_theme.dart';
import '../data/plan_detail.dart';
import 'plan_budget_panel.dart';

class PlanExpenseSheet extends StatefulWidget {
  const PlanExpenseSheet({
    super.key,
    required this.stop,
    required this.symbol,
    required this.save,
  });

  final PlanStop stop;
  final String symbol;
  final Future<void> Function(double) save;

  @override
  State<PlanExpenseSheet> createState() => _PlanExpenseSheetState();
}

class _PlanExpenseSheetState extends State<PlanExpenseSheet> {
  final _controller = TextEditingController();
  bool _initialized = false, _busy = false;
  String? _validationError, _saveError;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      if (widget.stop.actual != null) {
        _controller.text = UnitFormatter.of(context)
            .number(widget.stop.actual!, fractionDigits: 2);
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy) return;
    final amount = double.tryParse(
      _controller.text.trim().replaceAll(',', '.'),
    );
    if (amount == null || !amount.isFinite || amount < 0) {
      setState(() => _validationError = 'Geçerli bir tutar gir (ör. 12,50).');
      return;
    }
    setState(() {
      _busy = true;
      _validationError = null;
      _saveError = null;
    });
    try {
      await widget.save(amount);
      if (mounted) {
        setState(() => _busy = false);
        Navigator.pop(context, true);
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _saveError = error is StateError
              ? error.message.toString()
              : 'Kaydedilemedi. Bağlantını kontrol et; yazdıkların korunuyor.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        24,
        12,
        24,
        MediaQuery.viewInsetsOf(context).bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF0E9),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.receipt_long_outlined,
                  color: AppColors.forest,
                ),
              ),
              const Spacer(),
              IconButton(
                tooltip: context.tr('Kapat'),
                onPressed: _busy ? null : () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            context.tr('Harcamanı kaydet'),
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            widget.stop.name,
            style: const TextStyle(
              color: AppColors.muted,
              fontSize: 14,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 22),
          TextField(
            controller: _controller,
            enabled: !_busy,
            autofocus: true,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _save(),
            onChanged: (_) {
              if (_validationError != null || _saveError != null) {
                setState(() {
                  _validationError = null;
                  _saveError = null;
                });
              }
            },
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w600,
              color: AppColors.text,
            ),
            decoration: InputDecoration(
              labelText: context.tr('Ödediğin tutar'),
              floatingLabelBehavior: FloatingLabelBehavior.always,
              prefixText: '${widget.symbol} ',
              hintText: '0',
              errorText: _validationError == null
                  ? null
                  : context.tr(_validationError!),
              errorMaxLines: 3,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            context.tr('Bu durak için toplam ödediğin tutarı gir.'),
            style: const TextStyle(
              color: AppColors.muted,
              fontSize: 12,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF5F0E7),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Wrap(
              spacing: 12,
              runSpacing: 6,
              alignment: WrapAlignment.spaceBetween,
              children: [
                Text(
                  context.tr('Tahmini maliyet'),
                  style: const TextStyle(color: AppColors.muted, fontSize: 13),
                ),
                Text(
                  budgetMoney(context, widget.symbol, widget.stop.estimated),
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          if (_saveError != null) ...[
            const SizedBox(height: 14),
            Semantics(
              liveRegion: true,
              child: Text(
                context.tr(_saveError!),
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                  height: 1.5,
                ),
              ),
            ),
          ],
          const SizedBox(height: 22),
          FilledButton.icon(
            onPressed: _busy ? null : _save,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            ),
            icon: _busy
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.check_rounded, size: 20),
            label: Text(context.tr(_busy ? 'Kaydediliyor…' : 'Kaydet')),
          ),
        ],
      ),
    ),
  );
}
